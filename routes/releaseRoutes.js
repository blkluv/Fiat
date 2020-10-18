const aws = require('aws-sdk');
const crypto = require('crypto');
const mongoose = require('mongoose');
const nem = require('nem-sdk').default;
const { AWS_REGION, BUCKET_IMG, BUCKET_OPT, BUCKET_SRC } = require('../config/constants');
const releaseOwner = require('../middlewares/releaseOwner');
const requireLogin = require('../middlewares/requireLogin');
const { fetchXemPrice, fetchXemPriceBinance } = require('../controllers/nemController');

const Artist = mongoose.model('artists');
const Release = mongoose.model('releases');
const User = mongoose.model('users');
aws.config.update({ region: AWS_REGION });

module.exports = app => {
  // Add New Release
  app.post('/api/release', requireLogin, async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId, '', { lean: true }).exec();
      const releases = await Release.find({ user: userId }, '', { lean: true }).exec();

      if (!user.nemAddress || !user.nemAddressVerified) {
        return res.send({
          warning: 'Please add and verify your NEM address first. You will need credit to add a release.'
        });
      }

      if (user.credits <= releases.length) {
        return res.send({
          warning:
            'Sorry, you don\u2019t have enough credit to add a new release. Please add more nemp3 credits to cover the number of releases you wish to create.'
        });
      }

      const incompleteReleases = await Release.where({
        releaseTitle: { $exists: false },
        'artwork.status': 'pending',
        $where: 'this.trackList.length === 0'
      }).exec();

      if (incompleteReleases.length >= 3) {
        const num = incompleteReleases.length;

        return res.send({
          warning: `It looks like you have ${incompleteReleases.length} release${
            num !== 1 ? 's' : ''
          } in need of completion already. Please complete ${num > 1 ? 'these' : 'that'} before creating another.`
        });
      }

      const release = await Release.create({ user: userId, dateCreated: Date.now() });
      res.send(release.toJSON());
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // Delete Release
  app.delete('/api/release/:releaseId', requireLogin, releaseOwner, async (req, res) => {
    try {
      const { releaseId } = req.params;
      const userId = req.user._id;

      // Delete from db
      const deleteRelease = await Release.findByIdAndRemove(releaseId).exec();

      const artistPullRelease = await Artist.findOneAndUpdate(
        { releases: releaseId, user: userId },
        { $pull: { releases: releaseId } },
        { fields: { releases: 1 }, lean: true, new: true }
      ).exec();

      let deleteArtist;
      let deleteArtistFromUser;
      if (artistPullRelease && !artistPullRelease.releases.length) {
        const artistId = artistPullRelease._id;
        deleteArtist = Artist.findByIdAndRemove(artistId).exec();
        deleteArtistFromUser = User.findByIdAndUpdate(req.user._id, { $pull: { artists: artistId } }).exec();
      }

      // Delete audio from S3
      const s3 = new aws.S3();

      // Delete source audio
      const listSrcParams = { Bucket: BUCKET_SRC, Prefix: `${releaseId}` };
      const s3SrcData = await s3.listObjectsV2(listSrcParams).promise();

      let deleteS3Src;
      if (s3SrcData.Contents.length) {
        const deleteSrcParams = {
          Bucket: BUCKET_SRC,
          Delete: {
            Objects: s3SrcData.Contents.map(track => ({
              Key: track.Key
            }))
          }
        };
        deleteS3Src = s3.deleteObjects(deleteSrcParams).promise();
      }

      // Delete streaming audio
      const listOptParams = { Bucket: BUCKET_OPT, Prefix: `mp4/${releaseId}` };
      const s3OptData = await s3.listObjectsV2(listOptParams).promise();

      let deleteS3Opt;
      if (s3OptData.Contents.length) {
        const deleteOptParams = {
          Bucket: BUCKET_OPT,
          Delete: {
            Objects: s3OptData.Contents.map(track => ({
              Key: track.Key
            }))
          }
        };
        deleteS3Opt = s3.deleteObjects(deleteOptParams).promise();
      }

      // Delete art from S3
      const listImgParams = { Bucket: BUCKET_IMG, Prefix: `${releaseId}` };
      const s3ImgData = await s3.listObjectsV2(listImgParams).promise();

      let deleteS3Img;
      if (s3ImgData.Contents.length) {
        const deleteImgParams = {
          Bucket: BUCKET_IMG,
          Key: s3ImgData.Contents[0].Key
        };
        deleteS3Img = s3.deleteObject(deleteImgParams).promise();
      }

      const [{ _id }] = await Promise.all([
        deleteRelease,
        artistPullRelease,
        deleteArtist,
        deleteArtistFromUser,
        deleteS3Src,
        deleteS3Opt,
        deleteS3Img
      ]);

      res.send(_id);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // Fetch fav count
  app.get('/api/release/:releaseId/favourites', requireLogin, releaseOwner, async (req, res) => {
    try {
      const { releaseId } = req.params;
      const favCount = await User.where({ 'favourites.releaseId': releaseId }).countDocuments().exec();
      res.send({ releaseId, favCount });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // Fetch Release
  app.get('/api/release/:releaseId', async (req, res) => {
    try {
      const release = await Release.findOne({ _id: req.params.releaseId }, '-trackList.mpd');

      if (!release.published && !release.user.equals(req.user._id)) {
        throw new Error('This release is currently unavailable.');
      }

      const artist = await User.findOne({ _id: release.user }, 'nemAddress', { lean: true });
      const paymentInfo = { paymentAddress: nem.utils.format.address(artist.nemAddress) };
      res.send({ release: release.toJSON(), paymentInfo });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // Purchase Release
  app.get('/api/purchase/:releaseId', requireLogin, async (req, res) => {
    try {
      delete req.session.price;
      const { releaseId } = req.params;
      const release = await Release.findById(releaseId, '-__v', { lean: true });
      const owner = await User.findById(release.user, 'nemAddress', { lean: true });
      const customer = await User.findById(req.user._id, 'auth.idHash', { lean: true });
      const customerIdHash = customer.auth.idHash;

      const xemPriceUsd = await fetchXemPriceBinance().catch(() => fetchXemPrice());
      const priceInXem = release.price / xemPriceUsd;
      const priceInRawXem = Math.ceil(priceInXem * 10 ** 6);
      req.session.price = priceInRawXem;
      const price = (priceInRawXem / 10 ** 6).toFixed(6);

      if (!owner.nemAddress) {
        const error = 'NEM payment address not found.';
        const paymentInfo = { paymentAddress: null, paymentHash: null };
        return res.send({ error, release, paymentInfo, price });
      }

      const hash = crypto.createHash('sha256');
      const paymentHash = hash.update(release._id.toString()).update(customerIdHash).digest('hex').substring(0, 32);
      const paymentInfo = { paymentAddress: nem.utils.format.address(owner.nemAddress), paymentHash };
      res.send({ release, paymentInfo, price });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // Toggle Release Status
  app.patch('/api/release/:releaseId', requireLogin, releaseOwner, async (req, res) => {
    try {
      const { releaseId } = req.params;
      const { nemAddress } = req.user;
      const release = await Release.findById(releaseId).exec();

      if (!nemAddress || !nem.model.address.isValid(nemAddress)) {
        release.updateOne({ published: false }).exec();
        throw new Error(
          'Please add a confirmed NEM address to your account before publishing this release (\u2018Payment\u2019 tab).'
        );
      }

      if (release.artwork.status !== 'stored') {
        release.updateOne({ published: false }).exec();
        throw new Error('Please ensure the release has artwork uploaded before publishing.');
      }

      if (!release.trackList.length) {
        release.updateOne({ published: false }).exec();
        throw new Error('Please add at least one track to the release, with audio and a title, before publishing.');
      }

      if (release.trackList.some(track => track.status !== 'stored')) {
        release.updateOne({ published: false }).exec();
        throw new Error('Please ensure that all tracks have audio uploaded before publishing.');
      }

      if (release.trackList.some(track => !track.trackTitle)) {
        release.updateOne({ published: false }).exec();
        throw new Error('Please ensure that all tracks have titles set before publishing.');
      }

      release.published = !release.published;
      const updatedRelease = await release.save();
      res.send(updatedRelease.toJSON());
    } catch (error) {
      res.status(200).send({ error: error.message });
    }
  });

  // Update Release
  app.put('/api/release', requireLogin, async (req, res) => {
    try {
      const releaseId = req.body._id;
      const userId = req.user._id;

      const {
        artistName,
        catNumber,
        cLine,
        credits,
        info,
        pLine,
        price,
        recordLabel,
        releaseDate,
        releaseTitle,
        tags,
        trackList
      } = req.body;

      const release = await Release.findById(releaseId);
      const prevArtistName = release.artistName || artistName; // So we can update existing records saved with old name.
      release.artistName = artistName;
      release.catNumber = catNumber;
      release.credits = credits;
      release.info = info;
      release.price = price;
      release.recordLabel = recordLabel;
      release.releaseDate = releaseDate;
      release.releaseTitle = releaseTitle;
      release.pLine.year = pLine && pLine.year;
      release.pLine.owner = pLine && pLine.owner;
      release.cLine.year = cLine && cLine.year;
      release.cLine.owner = cLine && cLine.owner;
      release.tags = tags;

      release.trackList.forEach(track => {
        track.trackTitle = trackList.find(update => update._id.toString() === track._id.toString()).trackTitle;
      });

      let artistId = release.artist;
      // Check for artist first using the previous release artist name, just in case it has since been changed.
      const shouldUpdateArtist = await Artist.exists({ _id: artistId, name: prevArtistName, user: userId });
      const artistNameExists = await Artist.exists({ name: artistName, user: userId });

      if (shouldUpdateArtist && artistNameExists) {
        // Merge artists
        const mergedArtist = await Artist.findOneAndUpdate(
          { name: artistName, user: userId },
          { $set: { name: artistName }, $addToSet: { releases: releaseId } },
          { fields: { _id: 1 }, lean: true, new: true }
        ).exec();

        const prevArtist = await Artist.findByIdAndUpdate(
          artistId,
          { $pull: { releases: releaseId } },
          { fields: { _id: 1, releases: 1 }, lean: true, new: true }
        ).exec();

        await User.findByIdAndUpdate(req.user._id, { $pull: { artists: prevArtist._id } }).exec();
        if (!prevArtist.releases.length) await Artist.findByIdAndDelete(prevArtist._id).exec();
        artistId = mergedArtist._id;
      } else if (shouldUpdateArtist) {
        // Update artists
        await Artist.findByIdAndUpdate(artistId, {
          $set: { name: artistName },
          $addToSet: { releases: releaseId }
        }).exec();
      } else if (artistNameExists) {
        // Add to existing artist
        const artist = await Artist.findOneAndUpdate(
          { name: artistName, user: userId },
          { $set: { name: artistName }, $addToSet: { releases: releaseId } },
          { fields: { _id: 1 }, lean: true, new: true }
        ).exec();

        artistId = artist._id;
      } else {
        // Create new artist
        const artist = await Artist.create([{ name: artistName, releases: [releaseId], user: userId }], {
          fields: { _id: 1 },
          lean: true,
          new: true
        });

        artistId = artist[0]._id;
      }

      // Add artist ID to user account if it doesn't already exist.
      await User.findByIdAndUpdate(userId, { $addToSet: { artists: artistId } }).exec();
      release.artist = artistId;
      const updatedRelease = await release.save();
      res.send(updatedRelease.toJSON());
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });
};
