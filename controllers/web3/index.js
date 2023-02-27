import { Contract, Interface, ethers, encodeBytes32String, getAddress } from "ethers";
import GridFireEditions from "gridfire/hardhat/artifacts/contracts/GridFireEditions.sol/GridFireEditions.json" assert { type: "json" };
import GridFirePayment from "gridfire/hardhat/artifacts/contracts/GridFirePayment.sol/GridFirePayment.json" assert { type: "json" };
import Edition from "gridfire/models/Edition.js";
import Release from "gridfire/models/Release.js";
import User from "gridfire/models/User.js";
import daiAbi from "gridfire/controllers/web3/dai.js";

const { GRIDFIRE_EDITIONS_ADDRESS, GRIDFIRE_PAYMENT_ADDRESS, DAI_CONTRACT_ADDRESS, NETWORK_URL, NETWORK_KEY } =
  process.env;
const { abi: gridFireEditionsABI } = GridFireEditions;
const { abi: gridFirePaymentABI } = GridFirePayment;

const getProvider = () => {
  return ethers.getDefaultProvider(`${NETWORK_URL}/${NETWORK_KEY}`);
};

const getDaiContract = () => {
  const provider = getProvider();
  return new Contract(DAI_CONTRACT_ADDRESS, daiAbi, provider);
};

const getGridFireEditionsContract = () => {
  const provider = getProvider();
  return new Contract(GRIDFIRE_EDITIONS_ADDRESS, gridFireEditionsABI, provider);
};

const getGridFirePaymentContract = () => {
  const provider = getProvider();
  return new Contract(GRIDFIRE_PAYMENT_ADDRESS, gridFirePaymentABI, provider);
};

const getGridFireEditionsByReleaseId = async releaseId => {
  const provider = getProvider();
  const gridFireEditionsContract = getGridFireEditionsContract(provider);

  const offChainEditions = await Edition.find(
    { release: releaseId, status: "minted" },
    "createdAt editionId metadata",
    { lean: true }
  ).exec();

  const release = await Release.findById(releaseId, "user", { lean: true }).populate("user").exec();
  const artistAccount = getAddress(release.user.account);
  const releaseIdBytes = encodeBytes32String(releaseId);
  const mintFilter = gridFireEditionsContract.filters.EditionMinted(releaseIdBytes, artistAccount);
  const mintEvents = await gridFireEditionsContract.queryFilter(mintFilter);

  const editions = mintEvents.map(({ args }) => {
    const { amount, editionId, artist, price } = args;

    return {
      amount: amount.toString(),
      editionId: editionId.toString(),
      artist,
      price: price.toString(),
      releaseId
    };
  });

  const accounts = Array(editions.length).fill(GRIDFIRE_EDITIONS_ADDRESS);
  const ids = editions.map(({ editionId }) => editionId);
  const balances = await gridFireEditionsContract.balanceOfBatch(accounts, ids);
  const balancesMap = balances.reduce((map, balance, index) => map.set(ids[index], balance.toString()), new Map());
  const offChainEditionsMap = offChainEditions.reduce((map, edition) => map.set(edition.editionId, edition), new Map());
  const matchedOffChain = ({ editionId }) => offChainEditionsMap.has(editionId);

  // Filter out editions we don't have in the db, add balances and metadata for convenience.
  return editions.filter(matchedOffChain).map(edition => {
    const { editionId } = edition;
    const { createdAt, metadata } = offChainEditionsMap.get(editionId);
    edition.balance = balancesMap.get(editionId);
    edition.createdAt = createdAt;
    edition.metadata = metadata;
    return edition;
  });
};

const getGridFireEditionUris = async releaseId => {
  const provider = getProvider();
  const gridFireEditionsContract = getGridFireEditionsContract(provider);
  const release = await Release.findById(releaseId, "user", { lean: true }).populate("user").exec();
  const artistAccount = getAddress(release.user.account);
  const releaseIdBytes = encodeBytes32String(releaseId);
  const mintFilter = gridFireEditionsContract.filters.EditionMinted(releaseIdBytes, artistAccount);
  const mintEvents = await gridFireEditionsContract.queryFilter(mintFilter);
  const ids = mintEvents.map(({ args }) => args.editionId);
  const uris = Promise.all(ids.map(id => gridFireEditionsContract.uri(id)));
  return uris;
};

const getTransaction = async txId => {
  const provider = getProvider();
  const tx = await provider.getTransaction(txId);
  const iface = new Interface(gridFireEditionsABI);
  const parsedTx = iface.parseTransaction(tx);
  return parsedTx;
};

const getUserGridFireEditions = async userId => {
  const user = await User.findById(userId).exec();
  const userAccount = getAddress(user.account);
  const provider = getProvider();
  const gridFireEditionsContract = getGridFireEditionsContract(provider);

  // Get all editions sent to user (may not still be in possession, so check balances).
  const editionsTransferFilter = gridFireEditionsContract.filters.TransferSingle(null, null, userAccount);
  const transfers = await gridFireEditionsContract.queryFilter(editionsTransferFilter);
  if (!transfers.length) return []; // User account has never received anything.
  const transferEditionIds = transfers.map(({ args }) => args.id);
  const accounts = Array(transferEditionIds.length).fill(userAccount);
  const balances = await gridFireEditionsContract.balanceOfBatch(accounts, transferEditionIds);
  const inPossession = transfers.filter((_, index) => balances[index] !== 0n);
  const inPossessionIds = inPossession.map(({ args }) => args.id.toString());

  // From these IDs, fetch minted Editions that we have recorded off-chain, for release info.
  const mintedEditions = await Edition.find({ editionId: { $in: inPossessionIds }, status: "minted" }, "-cid", {
    lean: true
  })
    .populate({
      path: "release",
      model: Release,
      options: { lean: true },
      populate: { path: "user", model: User, options: { lean: true }, select: "account" },
      select: "artistName artwork releaseTitle trackList._id trackList.trackTitle user"
    })
    .exec();

  // All editions purchased by user (to get amount paid).
  const editions = await Promise.all(
    mintedEditions.map(async edition => {
      const { editionId, release } = edition;
      const { account } = release.user;
      const artistAccount = getAddress(account);
      const idString = editionId.toString();

      // Get purchase information for Editions that were purchased
      const editionsPurchaseFilter = gridFireEditionsContract.filters.PurchaseEdition(userAccount, artistAccount);
      const transfersIndex = transferEditionIds.findIndex(_id => _id.toString() === idString);
      const balance = balances[transfersIndex].toString();
      const purchases = await gridFireEditionsContract.queryFilter(editionsPurchaseFilter);
      const { args, transactionHash } = purchases.find(({ args }) => args.editionId.toString() === idString) || {};
      const { amountPaid } = args;
      const paid = amountPaid.toString();

      return {
        ...edition,
        _id: transactionHash,
        balance,
        ...(transactionHash ? { paid } : {}),
        ...(transactionHash
          ? { transaction: { transactionHash } }
          : { transaction: { transactionHash: transfers[transfersIndex].transactionHash } })
      };
    })
  );

  return editions;
};

export {
  getDaiContract,
  getGridFireEditionsContract,
  getGridFirePaymentContract,
  getGridFireEditionsByReleaseId,
  getGridFireEditionUris,
  getProvider,
  getTransaction,
  getUserGridFireEditions
};
