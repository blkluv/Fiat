const mongoose = require('mongoose');
const { Schema } = mongoose;

const releaseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist' },
    artistName: { type: String, trim: true },
    releaseTitle: { type: String, trim: true },
    artwork: {
      dateCreated: { type: Date },
      dateUpdated: { type: Date },
      status: { type: String, default: 'pending' }
    },
    releaseDate: { type: Date },
    price: { type: Number },
    recordLabel: { type: String, trim: true },
    catNumber: { type: String, trim: true },
    credits: { type: String, trim: true },
    info: { type: String, trim: true },
    cLine: { year: Number, owner: { type: String, trim: true } },
    pLine: { year: Number, owner: { type: String, trim: true } },
    trackList: [
      {
        trackTitle: { type: String, trim: true },
        status: { type: String, default: 'pending' },
        duration: { type: Number, trim: true },
        mpd: { type: Buffer },
        initRange: { type: String },
        segmentList: { type: Array },
        dateCreated: { type: Date },
        dateUpdated: { type: Date }
      }
    ],
    tags: [String],
    dateCreated: { type: Date },
    dateUpdated: { type: Date },
    published: { type: Boolean, default: false }
  },
  { usePushEach: true }
);

releaseSchema.index({
  artistName: 'text',
  releaseTitle: 'text',
  'trackList.trackTitle': 'text',
  tags: 'text'
});

releaseSchema.post('save', release => {
  release.updateOne({ dateUpdated: Date.now() }).exec();
});

releaseSchema.set('toJSON', { versionKey: false });

releaseSchema.options.toJSON.transform = function (doc, ret) {
  ret.trackList.forEach(track => delete track.mpd);
  return ret;
};

mongoose.model('releases', releaseSchema);
