import { encryptStream, decryptStream } from "../../controllers/encryption.js";
import { Readable } from "stream";
import Release from "../models/Release.js";
import User from "../models/User.js";
import { ffmpegEncodeFLAC } from "./ffmpeg.js";
import fs from "fs";
import { ipfs } from "./index.js";
import path from "path";
import postMessage from "./postMessage.js";
import { publishToQueue } from "../publisher/index.js";
import tar from "tar-stream";

const { TEMP_PATH, WORKER_QUEUE } = process.env;

const onProgress =
  (trackId, userId) =>
  ({ targetSize, timemark }) => {
    const [hours, mins, seconds] = timemark.split(":");
    const [s] = seconds.split(".");
    const h = hours !== "00" ? `${hours}:` : "";

    postMessage({
      message: `Encoded FLAC: ${h}${mins}:${s} (${targetSize}kB complete)`,
      trackId,
      type: "encodingProgressFLAC",
      userId
    });
  };

const encodeFLAC = async ({ cid, releaseId, trackId, trackName, userId }) => {
  try {
    postMessage({ message: "Encoding flac…", title: "Processing", userId });

    await Release.findOneAndUpdate(
      { _id: releaseId, "trackList._id": trackId },
      { "trackList.$.status": "encoding" }
    ).exec();

    const { key } = await User.findById(userId, "+key", { lean: true }).exec();
    postMessage({ type: "updateTrackStatus", releaseId, trackId, status: "encoding", userId });
    const flacPath = path.resolve(TEMP_PATH, `${trackId}.flac`);
    const tarStream = Readable.from(ipfs.get(cid));
    const tarExtract = tar.extract();

    await new Promise((resolve, reject) => {
      tarExtract.on("entry", async (header, srcStream, next) => {
        const handleStreamError = stream => error => {
          console.log(error);
          stream.destory();
          throw error;
        };

        try {
          srcStream.on("error", handleStreamError(srcStream));
          const decryptedStream = await decryptStream(srcStream, key);
          await ffmpegEncodeFLAC(decryptedStream, flacPath, onProgress(trackId, userId));
          next();
        } catch (error) {
          srcStream.destroy(error);
          throw error;
        }
      });

      tarExtract.on("finish", resolve);
      tarExtract.on("error", reject);
      tarStream.pipe(tarExtract);
    });

    const { size } = await fs.promises.stat(flacPath);
    const flacFileStream = fs.createReadStream(flacPath);
    const encryptedFlacStream = encryptStream(flacFileStream, key);

    const ipfsFLAC = await ipfs.add(encryptedFlacStream, {
      progress: progress => {
        const percent = Math.floor((progress / size) * 100);

        postMessage({
          message: `Saving FLAC (${percent}% complete)`,
          trackId,
          type: "storingProgressFLAC",
          userId
        });
      }
    });

    await Release.findOneAndUpdate(
      { _id: releaseId, "trackList._id": trackId },
      { "trackList.$.status": "encoded", "trackList.$.cids.flac": ipfsFLAC.cid.toString() }
    ).exec();

    postMessage({ type: "updateTrackStatus", releaseId, trackId, status: "encoded", userId });
    postMessage({ type: "encodingCompleteFLAC", trackId, userId });
    publishToQueue("", WORKER_QUEUE, { job: "transcodeAAC", releaseId, trackId, trackName, userId });
    publishToQueue("", WORKER_QUEUE, { job: "transcodeMP3", releaseId, trackId, userId });
  } catch (error) {
    await Release.findOneAndUpdate(
      { _id: releaseId, "trackList._id": trackId },
      { "trackList.$.status": "error", "trackList.$.dateUpdated": Date.now() }
    ).exec();

    console.log(error);
    postMessage({ type: "updateTrackStatus", releaseId, trackId, status: "error", userId });
    throw error;
  }
};

export default encodeFLAC;
