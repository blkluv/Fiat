import mongoose from "mongoose";

const { Schema } = mongoose;

const trackStatusEnum = [
  "pending",
  "uploading",
  "uploaded",
  "encoding",
  "encoded",
  "transcoding",
  "stored",
  "error",
  "deleting"
];

const trackSchema = new Schema(
  {
    position: { type: Number, select: false },
    trackTitle: { type: String, trim: true },
    status: { type: String, enum: trackStatusEnum, default: "pending" },
    duration: { type: Number, trim: true },
    flac: { type: String },
    hls: { type: String },
    mst: { type: String },
    mp3: { type: String },
    mp4: { type: String },
    mpd: { type: String },
    src: { type: String }
  },
  { timestamps: true }
);

const releaseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    artist: { type: Schema.Types.ObjectId, ref: "Artist" },
    artistName: { type: String, trim: true },
    releaseTitle: { type: String, trim: true },
    artwork: {
      dateCreated: { type: Date },
      dateUpdated: { type: Date },
      status: {
        type: String,
        enum: ["pending", "storing", "stored"],
        default: "pending"
      },
      cid: { type: String }
    },
    releaseDate: { type: Date },
    price: { type: Number },
    recordLabel: { type: String, trim: true },
    catNumber: { type: String, trim: true },
    credits: { type: String, trim: true },
    info: { type: String, trim: true },
    pubYear: { type: Number, trim: true },
    pubName: { type: String, trim: true },
    recYear: { type: Number, trim: true },
    recName: { type: String, trim: true },
    trackList: [trackSchema],
    tags: [String],
    published: { type: Boolean, default: false }
  },
  { timestamps: true, usePushEach: true }
);

releaseSchema.index({
  artistName: "text",
  catNumber: "text",
  recordLabel: "text",
  releaseTitle: "text",
  "trackList.trackTitle": "text",
  tags: "text"
});

releaseSchema.post("save", release => {
  release.updateOne({ dateUpdated: Date.now() }).exec();
});

releaseSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.createdAt;
    delete ret.updatedAt;
    delete ret.artwork?.dateCreated;
    delete ret.artwork?.dateUpdated;

    ret.trackList.forEach(track => {
      delete track.createdAt;
      delete track.flac;
      delete track.mp3;
      delete track.src;
      delete track.updatedAt;
    });

    return ret;
  },
  versionKey: false
});

const Release = mongoose.model("Release", releaseSchema, "releases");
export default Release;
