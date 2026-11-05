import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  watch: { type: mongoose.Schema.Types.ObjectId, ref: "Watch", required: true },
  variant: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, max: 10 },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Cart || mongoose.model("Cart", cartSchema);
