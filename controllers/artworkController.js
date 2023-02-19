import { deleteObject, streamFromBucket, streamToBucket } from "gridfire/controllers/storage.js";
import Release from "gridfire/models/Release.js";
import fs from "fs";
import sharp from "sharp";

const { BUCKET_IMG } = process.env;

const fsPromises = fs.promises;

const deleteArtwork = async releaseId => {
  await Release.findByIdAndUpdate(releaseId, {
    "artwork.status": "deleting",
    "artwork.dateUpdated": Date.now()
  }).exec();

  await deleteObject(BUCKET_IMG, releaseId);

  const updatedRelease = await Release.findByIdAndUpdate(releaseId, {
    "artwork.status": "pending",
    "artwork.dateUpdated": Date.now(),
    published: false
  }).exec();

  return updatedRelease.toJSON();
};

const getArtworkStream = (releaseId) => streamFromBucket(BUCKET_IMG, releaseId);

const uploadArtwork = async ({ filePath, releaseId, userId, sse }) => {
  try {
    await Release.findByIdAndUpdate(releaseId, {
      "artwork.status": "storing",
      "artwork.dateCreated": Date.now()
    }).exec();

    sse.send(userId, { message: "Optimising and storing artwork…", title: "Processing" });
    const file = fs.createReadStream(filePath);
    const optimisedImg = sharp().resize(1000, 1000).toFormat("jpeg");
    await streamToBucket(BUCKET_IMG, releaseId, file.pipe(optimisedImg));

    await Release.findByIdAndUpdate(releaseId, {
      "artwork.dateUpdated": Date.now(),
      "artwork.status": "stored"
    }).exec();

    sse.send(userId, { type: "artworkUploaded" });
  } finally {
    fsPromises.unlink(filePath).catch(console.log);
  }
};

export { deleteArtwork, getArtworkStream, uploadArtwork };
