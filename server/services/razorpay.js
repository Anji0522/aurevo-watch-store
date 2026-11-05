import Razorpay from "razorpay";
import { AppError } from "../middleware/errors.js";

export function getRazorpayClient() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new AppError(
      503,
      "Online payments are not configured. Add Razorpay test credentials to the server environment.",
    );
  }
  if (!RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
    throw new AppError(
      503,
      "Only Razorpay test-mode keys are accepted by this build.",
    );
  }
  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}
