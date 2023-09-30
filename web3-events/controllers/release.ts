import {
  PurchasedRelease,
  ReleaseAlbum,
  ReleaseSingle,
  ValidatePurchaseParams
} from "gridfire-web3-events/types/index.js";
import { getAddress, parseEther } from "ethers";
import mongoose from "mongoose";
import { SaleType } from "gridfire-web3-events/models/Sale.js";

const { Release, Sale, User } = mongoose.models;

const validatePurchase = async ({
  amountPaid,
  artistAddress,
  transactionHash,
  releaseId,
  userId
}: ValidatePurchaseParams): PurchasedRelease => {
  let release;
  let price;
  let releaseTitle;
  let type = SaleType.Album;

  // Check if the purchase is for a single or an album.
  const releaseWithSingle: ReleaseSingle = await Release.findOne(
    { "trackList._id": releaseId },
    "artist artistName trackList.$",
    { lean: true }
  )
    .populate({ path: "user", model: User, options: { lean: true }, select: "_id paymentAddress" })
    .exec();

  if (releaseWithSingle) {
    release = releaseWithSingle;
    const [track] = release.trackList;
    ({ price } = track);
    releaseTitle = track.trackTitle;
    type = SaleType.Single;
  } else {
    const releaseAlbum: ReleaseAlbum = await Release.findById(releaseId, "artist artistName price releaseTitle", {
      lean: true
    })
      .populate({ path: "user", model: User, options: { lean: true }, select: "_id paymentAddress" })
      .exec();

    release = releaseAlbum;
    ({ price, releaseTitle } = release);
  }

  const { user: artistUser } = release;

  if (getAddress(artistUser.paymentAddress) !== getAddress(artistAddress)) {
    throw new Error("Payment address and release artist address do not match.");
  }

  if (amountPaid < parseEther(price.toString())) {
    throw new Error("The amount paid is lower than the release price.");
  }

  if (
    await Sale.exists({
      paid: amountPaid.toString(),
      release: releaseId,
      "transaction.hash": transactionHash,
      type,
      user: userId
    })
  ) {
    throw new Error("The buyer already owns this release.");
  }

  return { release, releaseTitle, type };
};

export { validatePurchase };
