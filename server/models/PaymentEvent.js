import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "completed"],
      default: "processing",
    },
  },
  { timestamps: true },
);

export default mongoose.models.PaymentEvent ||
  mongoose.model("PaymentEvent", paymentEventSchema);
