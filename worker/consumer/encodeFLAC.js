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

const { TEMP_PATH, QUEUE_TRANSCODE } = process.env;

const onProgress =
  ({ trackId, userId }) =>
  event => {
    const { percent } = event;
    postMessage({ type: "encodingProgressFLAC", progress: Math.round(percent), trackId, userId });
  };

const encodeFLAC = async ({ cid, releaseId, trackId, trackName, userId }) => {
  try {
    await Release.findOneAndUpdate(
      { _id: releaseId, "trackList._id": trackId },
      { "trackList.$.status": "encoding" }
    ).exec();

    const { key } = await User.findById(userId, "key", { lean: true }).exec();
    const flacPath = path.resolve(TEMP_PATH, `${trackId}.flac`);
    const tarStream = Readable.from(ipfs.get(cid));
    const tarExtract = tar.extract();

    await new Promise((resolve, reject) => {
      tarExtract.on("entry", async (header, srcStream, next) => {
        const handleStreamError =
          (...streams) =>
          error => {
            console.log(error);
            for (const stream of streams) stream.destory();
            throw error;
          };

        try {
          const decryptedStream = await decryptStream(srcStream, key);
          srcStream.on("error", handleStreamError(srcStream, decryptedStream));
          decryptedStream.on("error", handleStreamError(srcStream, decryptedStream));
          await ffmpegEncodeFLAC(decryptedStream, flacPath, onProgress({ trackId, userId }));
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
      progress: progressBytes => {
        const progress = Math.floor((progressBytes / size) * 100);
        postMessage({ type: "storingProgressFLAC", progress, trackId, userId });
      }
    });

    await Release.findOneAndUpdate(
      { _id: releaseId, "trackList._id": trackId },
      { "trackList.$.status": "encoded", "trackList.$.cids.flac": ipfsFLAC.cid.toString() }
    ).exec();

    publishToQueue("", QUEUE_TRANSCODE, { job: "transcodeAAC", releaseId, trackId, trackName, userId });
    publishToQueue("", QUEUE_TRANSCODE, { job: "transcodeMP3", releaseId, trackId, userId });
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
