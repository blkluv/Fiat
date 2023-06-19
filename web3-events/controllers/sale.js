import mongoose from "mongoose";

const { Sale } = mongoose.models;

const bigIntToString = (prev, [key, value]) => ({ ...prev, [key]: value.toString() });

const recordSale = async ({ amountPaid, artistShare, platformFee, releaseId, transactionReceipt, type, userId }) => {
  const paid = amountPaid.toString();
  const { gasUsed, cumulativeGasUsed, gasPrice, ...restTxReceipt } = transactionReceipt;
  const { from: buyer, hash, status } = restTxReceipt;

  if (status !== 1) {
    throw new Error(`Transaction failed. Status: ${status}. Hash: ${hash}.`);
  }

  const saleExists = await Sale.exists({
    paid,
    release: releaseId,
    "transaction.hash": hash,
    type,
    user: userId
  });

  if (saleExists) {
    throw new Error("This sale has already been recorded.");
  }

  const bigIntValues = { gasUsed, cumulativeGasUsed, gasPrice };
  const bigIntValuesAsString = Object.entries(bigIntValues).reduce(bigIntToString, {});

  const sale = await Sale.create({
    purchaseDate: Date.now(),
    release: releaseId,
    paid,
    fee: platformFee.toString(),
    netAmount: artistShare.toString(),
    transaction: { ...restTxReceipt, ...bigIntValuesAsString },
    type,
    user: userId,
    userAddress: buyer
  });

  return sale;
};

export { recordSale };
