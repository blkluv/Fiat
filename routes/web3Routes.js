import {
  getDaiContract,
  getGridFireContract,
  getGridFireEditionsByReleaseId,
  getGridFireEditionUris,
  getUserGridFireEditions
} from "gridfire/controllers/web3/index.js";
import Edition from "gridfire/models/Edition.js";
import Release from "gridfire/models/Release.js";
import User from "gridfire/models/User.js";
import express from "express";
import requireLogin from "gridfire/middlewares/requireLogin.js";
import { utils } from "ethers";

const { CONTRACT_ADDRESS } = process.env;
const router = express.Router();

router.get("/approvals/:account", requireLogin, async (req, res) => {
  try {
    const { account } = req.params;
    const daiContract = getDaiContract();
    const approvalsFilter = daiContract.filters.Approval(account, CONTRACT_ADDRESS);
    const approvals = await daiContract.queryFilter(approvalsFilter);

    const leanApprovals = approvals.map(({ args, blockNumber, transactionHash }) => ({
      amount: args.wad,
      blockNumber,
      transactionHash
    }));

    res.send(leanApprovals);
  } catch (error) {
    console.error(error);
    res.sendStatus(400);
  }
});

router.get("/claims", requireLogin, async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { account } = await User.findById(userId);
    const gridFireContract = getGridFireContract();
    const claimFilter = gridFireContract.filters.Claim(account);
    const claims = await gridFireContract.queryFilter(claimFilter);

    const leanClaims = claims.map(({ args, blockNumber, transactionHash }) => {
      const { amount } = args;
      return { amount, blockNumber, transactionHash };
    });

    res.send(leanClaims);
  } catch (error) {
    console.error(error);
    res.sendStatus(400);
  }
});

router.get("/purchases", requireLogin, async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { paymentAddress } = await User.findById(userId);
    const gridFireContract = getGridFireContract();
    const purchaseFilter = gridFireContract.filters.Purchase(null, paymentAddress);
    const purchaseEditionFilter = gridFireContract.filters.PurchaseEdition(null, paymentAddress);

    const [purchases, editionPurchases] = await Promise.all([
      gridFireContract.queryFilter(purchaseFilter),
      gridFireContract.queryFilter(purchaseEditionFilter)
    ]);

    const leanPurchases = [...purchases, ...editionPurchases]
      .map(({ args, blockNumber, transactionHash }) => {
        const { buyer, editionId, releaseId, artistShare, platformFee } = args;
        return { blockNumber, buyer, editionId, releaseId, artistShare, platformFee, transactionHash };
      })
      .sort((a, b) => a.blockNumber - b.blockNumber);

    res.send(leanPurchases);
  } catch (error) {
    console.error(error);
    res.sendStatus(400);
  }
});
router.get("/editions/user", requireLogin, async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const editions = await getUserGridFireEditions(userId);
    res.json(editions);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || error.toString() });
  }
});

router.post("/editions/mint", requireLogin, async (req, res) => {
  try {
    const { app, body, hostname, protocol } = req;
    const { ipfs } = app.locals;
    const { description, price, releaseId, amount } = body;
    const release = await Release.findById(releaseId, "", { lean: true });
    const { catNumber, credits, info, releaseDate, releaseTitle: title, artistName: artist, artwork } = release;
    const priceInDai = Number(price).toFixed(2);
    const weiPrice = utils.parseEther(`${price}`);

    const tokenMetadata = {
      attributes: {
        display_type: "date",
        trait_type: "Release date",
        value: Date.parse(releaseDate)
      },
      name: title,
      description: description || `${artist} - ${title} (GridFire edition)`,
      external_url: `${protocol}://${hostname}/release/${releaseId}`,
      image: `ipfs://${artwork.cid}`,
      properties: {
        artist,
        title,
        totalSupply: amount,
        price: weiPrice,
        priceInDai,
        releaseDate: new Date(releaseDate).toUTCString(),
        catalogueNumber: catNumber,
        info,
        credits
      }
    };

    const upload = await ipfs.add(JSON.stringify(tokenMetadata), { cidVersion: 1 });
    const cid = upload.cid.toString();

    const { _id: objectId } = await Edition.create({
      release: releaseId,
      amount,
      price: weiPrice,
      metadata: tokenMetadata,
      cid
    });

    const metadataUri = `ipfs://${cid}`;
    res.send({ metadataUri, objectId });
  } catch (error) {
    console.error(error);
    res.sendStatus(400);
  }
});

router.get("/editions/:releaseId", requireLogin, async (req, res) => {
  try {
    const { releaseId } = req.params;
    const editions = await getGridFireEditionsByReleaseId(releaseId);
    res.json(editions);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || error.toString() });
  }
});

router.get("/editions/:releaseId/uri", requireLogin, async (req, res) => {
  try {
    const { releaseId } = req.params;
    const uris = await getGridFireEditionUris(releaseId);
    res.json(uris);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || error.toString() });
  }
});

export default router;
