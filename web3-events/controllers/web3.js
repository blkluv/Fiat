import { Contract, ethers, utils } from "ethers";
import Edition from "gridfire-web3-events/models/Edition.js";
import Release from "gridfire-web3-events/models/Release.js";
import Sale from "gridfire-web3-events/models/Sale.js";
import User from "gridfire-web3-events/models/User.js";
import gridFireEditionsABI from "gridfire-web3-events/controllers/gridFireEditionsABI.js";
import gridFirePaymentABI from "gridfire-web3-events/controllers/gridFirePaymentABI.js";
import { publishToQueue } from "./amqp.js";

const { GRIDFIRE_EDITIONS_ADDRESS, GRIDFIRE_PAYMENT_ADDRESS, NETWORK_URL, NETWORK_KEY } = process.env;

const getProvider = () => {
  return ethers.getDefaultProvider(`${NETWORK_URL}/${NETWORK_KEY}`);
};

const getGridFireEditionsContract = () => {
  const provider = getProvider();
  return new Contract(GRIDFIRE_EDITIONS_ADDRESS, gridFireEditionsABI, provider);
};
const getGridFirePaymentContract = () => {
  const provider = getProvider();
  return new Contract(GRIDFIRE_PAYMENT_ADDRESS, gridFirePaymentABI, provider);
};

const onEditionMinted = async (releaseIdBytes, artist, objectIdBytes, editionId) => {
  try {
    const date = new Date().toLocaleString("en-UK", { timeZone: "Europe/Amsterdam" });
    const releaseId = utils.parseBytes32String(releaseIdBytes);
    const objectId = utils.parseBytes32String(objectIdBytes);
    console.log(`[${date}] Edition minted by address: ${artist} for releaseId ${releaseId}.`);
    await Edition.findOneAndUpdate({ _id: objectId, release: releaseId }, { editionId, status: "minted" }).exec();
  } catch (error) {
    console.error("EditionMinted error:", error);
  }
};

const onPurchase = async (
  buyerAddress,
  artistAddress,
  releaseIdBytes,
  userIdBytes,
  amountPaid,
  artistShare,
  platformFee,
  event
) => {
  try {
    const date = new Date().toLocaleString("en-UK", { timeZone: "Europe/Amsterdam" });
    const daiPaid = utils.formatEther(amountPaid);
    const releaseId = utils.parseBytes32String(releaseIdBytes);
    const userId = utils.parseBytes32String(userIdBytes);
    console.log(`[${date}] User ${userId} paid ${daiPaid} DAI for release ${releaseId}.`);

    let price;
    let releaseTitle;
    let type = "album";

    // Check if the purchase is for a single or an album.
    let release = await Release.findOne({ "trackList._id": releaseId }, "artistName trackList.$", { lean: true })
      .populate({ path: "user", model: User, options: { lean: true }, select: "paymentAddress" })
      .exec();

    if (release) {
      const [track] = release.trackList;
      releaseTitle = track.trackTitle;
      ({ price } = track);
      type = "single";
    } else {
      release = await Release.findById(releaseId, "artistName price releaseTitle", { lean: true })
        .populate({ path: "user", model: User, options: { lean: true }, select: "paymentAddress" })
        .exec();

      ({ price, releaseTitle } = release);
    }

    const { artistName, user: artistUser } = release;

    if (utils.getAddress(artistUser.paymentAddress) !== utils.getAddress(artistAddress)) {
      throw new Error("Payment address and release artist address do not match.");
    }

    if (amountPaid.lt(utils.parseEther(price.toString()))) {
      throw new Error("The amount paid is lower than the release price.");
    }

    if (await Sale.exists({ release: releaseId, user: userId })) {
      throw new Error("The buyer already owns this release.");
    }

    const transactionReceipt = await event.getTransactionReceipt();
    const { from: buyer, status } = transactionReceipt;

    if (status === 1) {
      await Sale.create({
        purchaseDate: Date.now(),
        release: releaseId,
        paid: amountPaid,
        fee: platformFee,
        netAmount: artistShare,
        transaction: transactionReceipt,
        type,
        user: userId,
        userAddress: buyer
      }).catch(error => {
        if (error.code === 11000) return;
        console.error(error);
      });

      // Notify user of successful purchase.
      publishToQueue("user", userId, { artistName, releaseTitle, type: "purchaseEvent", userId });
      const artistUserId = artistUser._id.toString();

      // Notify artist of sale.
      publishToQueue("user", artistUserId, {
        artistName,
        artistShare: utils.formatEther(artistShare),
        buyerAddress,
        platformFee: utils.formatEther(platformFee),
        releaseTitle,
        type: "saleEvent",
        userId: artistUserId
      });
    }
  } catch (error) {
    console.error("[Web3 Events] 🔴 Purchase error:", error);
  }
};

const onPurchaseEdition = async (
  buyerAddress,
  artistAddress,
  editionId,
  amountPaid,
  artistShare,
  platformFee,
  releaseIdBytes,
  event
) => {
  try {
    const buyerAddressNormalised = utils.getAddress(buyerAddress);
    const buyerUser = await User.findOne({ account: buyerAddressNormalised }, "_id", { lean: true }).exec();
    if (!buyerUser) throw new Error(`Buyer user not found. Address: ${buyerAddressNormalised}`);
    const releaseId = utils.parseBytes32String(releaseIdBytes);
    const userId = buyerUser._id.toString();
    const date = new Date().toLocaleString("en-UK", { timeZone: "Europe/Amsterdam" });
    const daiPaid = utils.formatEther(amountPaid);
    const id = editionId.toString();

    console.log(
      `[${date}] User ${userId} paid ${daiPaid} DAI for GridFire Edition (${id}), release ${releaseId}, artist address: ${artistAddress}.`
    );

    const release = await Release.findById(releaseId, "artistName releaseTitle", { lean: true })
      .populate({ path: "user", model: User, options: { lean: true }, select: "paymentAddress" })
      .exec();

    const { artistName, releaseTitle, user: artistUser } = release;
    const transactionReceipt = await event.getTransactionReceipt();
    const { status } = transactionReceipt;

    if (status === 1) {
      // Notify user of successful purchase.
      publishToQueue("user", userId, { artistName, releaseTitle, type: "purchaseEditionEvent", userId });
      const artistUserId = artistUser._id.toString();

      // Notify artist of sale.
      publishToQueue("user", artistUserId, {
        artistName,
        artistShare: utils.formatEther(artistShare),
        buyerAddress,
        platformFee: utils.formatEther(platformFee),
        releaseTitle,
        type: "saleEvent",
        userId: artistUserId
      });
    }
  } catch (error) {
    console.error("[Web3 Events] 🔴 Edition Purchase error:", error);
  }
};

export { getGridFireEditionsContract, getGridFirePaymentContract, onEditionMinted, onPurchase, onPurchaseEdition };
