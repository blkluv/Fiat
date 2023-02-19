import { getTransaction } from "gridfire/controllers/web3/index.js";
import Edition from "gridfire/models/Edition.js";
import Release from "gridfire/models/Release.js";
import Sale from "gridfire/models/Sale.js";
import User from "gridfire/models/User.js";
import express from "express";
import requireLogin from "gridfire/middlewares/requireLogin.js";
import { utils } from "ethers";
import { zipDownload } from "gridfire/controllers/archiveController.js";

const router = express.Router();

router.get("/:purchaseId/:format", requireLogin, async (req, res) => {
  try {
    const { format, purchaseId } = req.params;
    const userId = req.user._id;
    const isEdition = utils.isHexString(purchaseId);
    let release;

    if (isEdition) {
      const tx = await getTransaction(purchaseId);
      const { editionId, id } = tx.args; // 'editionId' from PurchaseEdition event, or 'id' from TransferSingle event.

      const edition = await Edition.findOne({ editionId: editionId || id })
        .populate({
          path: "release",
          model: Release,
          options: {
            lean: true,
            select: "artistName artwork releaseTitle trackList"
          },
          populate: { path: "user", model: User, options: { lean: true }, select: "key" }
        })
        .exec();

      ({ release } = edition);
    } else {
      const sale = await Sale.findOne({ user: userId, _id: purchaseId }).exec();
      if (!sale) return res.status(401).send({ error: "Not authorised." });

      if (sale.type === "single") {
        release = await Release.findOne(
          { "trackList._id": sale.release, published: true },
          "artistName artwork releaseTitle trackList.$",
          { lean: true }
        )
          .populate({ path: "user", model: User, options: { lean: true }, select: "key" })
          .exec();
      } else {
        release = await Release.findOne(
          { _id: sale.release, published: true },
          "artistName artwork releaseTitle trackList",
          { lean: true }
        )
          .populate({ path: "user", model: User, options: { lean: true }, select: "key" })
          .exec();
      }
    }

    if (!release) return res.sendStatus(404);
    const { key } = release.user;
    zipDownload({ isEdition, key, release, res, format });
  } catch (error) {
    console.error(error);
    res.sendStatus(403);
  }
});

export default router;
