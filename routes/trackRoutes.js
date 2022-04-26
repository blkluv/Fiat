import Busboy from "busboy";
import Release from "../models/Release.js";
import StreamSession from "../models/StreamSession.js";
import User from "../models/User.js";
import { encryptStream } from "../controllers/encryption.js";
import express from "express";
import mime from "mime-types";
import mongoose from "mongoose";
import { publishToQueue } from "../controllers/amqp/publisher.js";
import requireLogin from "../middlewares/requireLogin.js";

const { QUEUE_TRANSCODE } = process.env;
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { headers } = req;
    const busboy = Busboy({ headers, limits: { fileSize: 1024 * 16 } });

    busboy.on("error", async error => {
      console.log(error);
      req.unpipe(busboy);
      res.sendStatus(400);
    });

    busboy.on("file", async (name, file) => {
      if (name !== "message") return void busboy.emit(new Error("Internal error."));

      try {
        const kidsBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          file.on("data", chunk => chunks.push(chunk));
          file.on("end", () => resolve(Buffer.concat(chunks)));
          file.on("error", reject);
        });

        console.log(kidsBuffer.toString());
        const message = JSON.parse(kidsBuffer.toString());
        console.log(message);
        const [kidBase64] = message.kids;
        const kid = Buffer.from(kidBase64, "base64url").toString("hex");
        const release = await Release.findOne({ "trackList.kid": kid }, "trackList.$", { lean: true }).exec();
        const [track] = release.trackList;
        const { key } = track;

        const keysObj = {
          keys: [{ kty: "oct", k: Buffer.from(key, "hex").toString("base64url"), kid: kidBase64 }],
          type: "temporary"
        };

        console.log(keysObj);
        const keysBuffer = Buffer.from(JSON.stringify(keysObj));
        res.send(keysBuffer);
      } catch (error) {
        console.log(error);
        busboy.emit(error);
      }
    });

    req.pipe(busboy);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

router.get("/:trackId/init", async (req, res) => {
  try {
    const { trackId } = req.params;
    const release = await Release.findOne({ "trackList._id": trackId }, "trackList.$ user").exec();
    const releaseId = release._id;
    const { cids, duration, initRange, segmentList } = release.trackList.id(trackId);
    const cidMP4 = cids.mp4;

    // If user is not logged in, generate a session userId for play tracking (or use one already present in session from previous anonymous plays).
    const user = req.user?._id || req.session.user || mongoose.Types.ObjectId();
    req.session.user = user;
    res.send({ duration, cid: cidMP4, range: initRange });

    if (!release.user.equals(user)) {
      try {
        await StreamSession.create({
          user,
          release: releaseId,
          trackId,
          segmentsTotal: segmentList.length
        });
      } catch (error) {
        if (error.code === 11000) return;
        res.status(400).json({ error: error.message || error.toString() });
      }
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

router.get("/:trackId/stream", async (req, res) => {
  try {
    const { trackId } = req.params;
    const { time, type } = req.query;
    const release = await Release.findOne({ "trackList._id": trackId }, "trackList.$ user").exec();
    const { cids, segmentList, segmentDuration, segmentTimescale } = release.trackList.id(trackId);
    const cidMP4 = cids.mp4;
    const segmentTime = Number.parseFloat(time) / (segmentDuration / segmentTimescale);
    const indexLookup = { 0: 0, 1: Math.ceil(segmentTime), 2: Math.floor(segmentTime) };
    const index = indexLookup[type];
    const range = segmentList[index];
    const end = index + 1 === segmentList.length;
    res.send({ cid: cidMP4, range, end });

    // If user is not logged in, use the session userId for play tracking.
    const user = req.user?._id || req.session.user;

    if (!release.user.equals(user)) {
      await StreamSession.findOneAndUpdate({ user, trackId }, { $inc: { segmentsFetched: 1 } }, { new: true }).exec();
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message || error.toString() });
  }
});

router.delete("/:releaseId/:trackId", requireLogin, async (req, res) => {
  try {
    const { releaseId, trackId } = req.params;
    const { ipfs } = req.app.locals;
    const user = req.user._id;
    const release = await Release.findOne({ _id: releaseId, user }, "trackList._id trackList.cids").exec();
    if (!release) return res.sendStatus(403);
    const trackDoc = release.trackList.id(trackId);
    if (!trackDoc) return res.sendStatus(200);
    trackDoc.status = "deleting";
    await release.save();

    console.log("Unpinning track audio…");
    for (const cid of Object.values(trackDoc.cids)) {
      console.log(`Unpinning CID ${cid} for track ${trackId}…`);
      await ipfs.pin.rm(cid).catch(console.error);
    }

    trackDoc.remove();
    if (!release.trackList.length) release.published = false;
    await release.save();
    console.log(`Track ${trackId} deleted.`);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message || error.toString() });
  }
});

router.post("/:releaseId/upload", requireLogin, async (req, res) => {
  try {
    const { app, headers, params, user } = req;
    const { releaseId } = params;
    const { ipfs, sse } = app.locals;
    const userId = user._id.toString();
    const formData = {};
    const filter = { _id: releaseId, user: userId };
    const options = { new: true, upsert: true };
    const release = await Release.findOneAndUpdate(filter, {}, options).exec();
    const { key } = await User.findById(userId, "key", { lean: true }).exec();
    const busboy = Busboy({ headers, limits: { fileSize: 1024 * 1024 * 200 } });

    busboy.on("error", async error => {
      console.log(error);
      req.unpipe(busboy);
      res.status(400).json({ error: "Error. Could not upload this file." });
    });

    busboy.on("field", (key, value) => {
      formData[key] = value;
    });

    busboy.on("file", async (fieldName, fileStream, { mimeType }) => {
      if (fieldName !== "trackAudioFile") return res.sendStatus(403);
      const { trackId, trackName } = formData;
      const accepted = ["aiff", "flac", "wav"].includes(mime.extension(mimeType));

      if (!accepted) {
        throw new Error("File type not recognised. Needs to be flac/aiff/wav.");
      }

      let track = release.trackList.id(trackId);

      if (track) {
        const {
          trackList: [{ cids }]
        } = await Release.findOne({ _id: releaseId, "trackList._id": trackId }, "trackList.$").exec();

        console.log("Unpinning existing track audio…");
        for (const cid of Object.values(cids)) {
          console.log(`Unpinning CID ${cid} for track ${trackId}…`);
          await ipfs.pin.rm(cid).catch(console.error);
        }

        track.set({ dateUpdated: Date.now(), status: "uploading" });
      } else {
        release.trackList.addToSet({ _id: trackId, dateUpdated: Date.now(), status: "uploading" });
        track = release.trackList.id(trackId);
      }

      sse.send(userId, { type: "updateTrackStatus", releaseId, trackId, status: "uploading" });

      try {
        const encryptedStream = encryptStream(fileStream, key);
        const ipfsFile = await ipfs.add(encryptedStream);
        const cid = ipfsFile.cid.toString();
        track.set({ dateUpdated: Date.now(), status: "uploaded", cids: { src: cid } });
        await release.save();
        sse.send(userId, { type: "updateTrackStatus", releaseId, trackId, status: "uploaded" });

        if ([cid, releaseId, trackId, trackName, userId].includes(undefined)) {
          throw new Error("Job parameters missing.");
        }

        publishToQueue("", QUEUE_TRANSCODE, { userId, cid, job: "encodeFLAC", releaseId, trackId, trackName });
      } catch (error) {
        busboy.emit("error", error);
        fileStream.destroy();
      }
    });

    busboy.on("finish", () => {
      if (!res.headersSent) res.sendStatus(200);
    });

    req.pipe(busboy);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "Error. Could not upload this file." });
  }
});

export default router;
