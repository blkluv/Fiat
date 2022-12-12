import mongoose from "mongoose";

const { Schema } = mongoose;
const { Types } = Schema;

const editionSchema = new Schema(
  {
    release: { type: Types.ObjectId, ref: "Release", required: true },
    editionId: { type: Object },
    tracks: [Types.ObjectId],
    amount: { type: Object, required: true },
    price: { type: Object, required: true },
    status: { type: String, enum: ["pending", "minted"], default: "pending" },
    metadata: { type: Object, required: true },
    cid: { type: String, required: true }
  },
  { timestamps: true }
);

editionSchema.index({ release: 1 });
const Edition = mongoose.model("Edition", editionSchema, "editions");
export default Edition;
