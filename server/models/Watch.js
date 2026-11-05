import mongoose from "mongoose";

const watchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    collection: { type: String, required: true },
    price: { type: Number, required: true, min: 20001 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    description: { type: String, required: true },
    specs: { type: mongoose.Schema.Types.Mixed, required: true },
    variants: [
      {
        name: { type: String, required: true },
        dialColor: String,
        strapColor: String,
      },
    ],
    colors: [{ type: String }],
    stock: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    model3d: { type: String, default: "" },
    ratingTotal: { type: Number, default: 0, select: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    accent: { type: String, default: "#d5c6b3" },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

export default mongoose.models.Watch || mongoose.model("Watch", watchSchema);
