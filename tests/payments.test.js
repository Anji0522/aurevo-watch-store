import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  calculateOrderAmounts,
  GST_RATE,
  priceCheckoutItems,
  toPaise,
} from "../server/utils/pricing.js";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../server/services/paymentSettlement.js";
import { getRazorpayClient } from "../server/services/razorpay.js";
import Order from "../server/models/Order.js";

test("GST and delivery amounts are derived from server-priced line items", () => {
  const amounts = calculateOrderAmounts([
    { unitPrice: 48500, quantity: 2 },
    { unitPrice: 22000, quantity: 1 },
  ]);
  assert.equal(GST_RATE, 0.18);
  assert.deepEqual(amounts, {
    subtotal: 119000,
    gstRate: 0.18,
    gstAmount: 21420,
    deliveryAmount: 0,
    totalAmount: 140420,
  });
});

test("express delivery fee is included in the server total", () => {
  const amounts = calculateOrderAmounts(
    [{ unitPrice: 22000, quantity: 1 }],
    "express",
  );
  assert.equal(amounts.deliveryAmount, 499);
  assert.equal(amounts.totalAmount, 26459);
});

test("payment amounts convert whole rupees to integer paise only", () => {
  assert.equal(toPaise(26459), 2645900);
  assert.throws(() => toPaise(10.5), RangeError);
});

test("checkout prices always come from the catalog, not request-supplied prices", () => {
  const watchId = "watch-123";
  const watch = {
    _id: { toString: () => watchId },
    name: "Aurevo Chronos",
    slug: "aurevo-chronos",
    price: 48500,
    stock: 5,
    colors: ["Midnight"],
    variants: [],
  };
  const items = priceCheckoutItems(
    [{ watchId, variant: "Midnight", quantity: 2, price: 1, unitPrice: 1 }],
    [watch],
  );
  assert.equal(items[0].unitPrice, 48500);
  assert.equal(items[0].quantity, 2);
});

test("checkout rejects quantities above catalog stock", () => {
  const watchId = "watch-123";
  const watch = {
    _id: { toString: () => watchId },
    name: "Aurevo Chronos",
    slug: "aurevo-chronos",
    price: 48500,
    stock: 1,
    colors: ["Midnight"],
    variants: [],
  };
  assert.throws(
    () =>
      priceCheckoutItems(
        [{ watchId, variant: "Midnight", quantity: 2 }],
        [watch],
      ),
    /insufficient stock/,
  );
});

test("Razorpay client accepts test keys and rejects live keys", () => {
  const previous = {
    id: process.env.RAZORPAY_KEY_ID,
    secret: process.env.RAZORPAY_KEY_SECRET,
  };
  process.env.RAZORPAY_KEY_ID = "rzp_test_placeholder";
  process.env.RAZORPAY_KEY_SECRET = "test-secret-placeholder";
  assert.ok(getRazorpayClient());
  process.env.RAZORPAY_KEY_ID = "rzp_live_placeholder";
  assert.throws(getRazorpayClient, /Only Razorpay test-mode keys/);
  if (previous.id === undefined) delete process.env.RAZORPAY_KEY_ID;
  else process.env.RAZORPAY_KEY_ID = previous.id;
  if (previous.secret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
  else process.env.RAZORPAY_KEY_SECRET = previous.secret;
});

test("Razorpay checkout HMAC accepts the correct signature and rejects tampering", () => {
  const orderId = "order_test123";
  const paymentId = "pay_test456";
  const secret = "local-test-secret";
  const signature = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  assert.equal(
    verifyCheckoutSignature(orderId, paymentId, signature, secret),
    true,
  );
  assert.equal(
    verifyCheckoutSignature(
      orderId,
      paymentId,
      `${signature.slice(0, -1)}0`,
      secret,
    ),
    false,
  );
  assert.equal(
    verifyCheckoutSignature(orderId, paymentId, "not-hex", secret),
    false,
  );
});

test("webhook HMAC authenticates exact raw request bytes", () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const secret = "webhook-test-secret";
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, signature, secret), true);
  assert.equal(
    verifyWebhookSignature(Buffer.from(`${body} `), signature, secret),
    false,
  );
});

test("order payment enum has only approved online methods and no cash option", () => {
  const methods = Order.schema.path("paymentMethod").enumValues;
  assert.deepEqual(methods, ["upi", "card", "netbanking", "wallet", "emi"]);
  assert.ok(!methods.some((method) => /cash|cod/i.test(method)));
});
