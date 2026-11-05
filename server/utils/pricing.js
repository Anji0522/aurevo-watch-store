import { AppError } from "../middleware/errors.js";

export const GST_RATE = 0.18;

export function priceCheckoutItems(requestItems, catalog) {
  const byId = new Map(catalog.map((watch) => [watch._id.toString(), watch]));
  const pricedItems = requestItems.map((item) => {
    const watch = byId.get(item.watchId);
    if (!watch)
      throw new AppError(
        400,
        "One or more selected watches are no longer available.",
      );
    const availableVariants = watch.variants?.length
      ? watch.variants.map((variant) => variant.name)
      : watch.colors;
    if (
      availableVariants?.length &&
      !availableVariants.includes(item.variant)
    ) {
      throw new AppError(400, `The ${watch.name} variant is not available.`);
    }
    return {
      watch: watch._id,
      name: watch.name,
      slug: watch.slug,
      variant: item.variant,
      quantity: Number(item.quantity),
      unitPrice: watch.price,
    };
  });
  const quantities = new Map();
  for (const item of pricedItems) {
    const id = item.watch.toString();
    quantities.set(id, (quantities.get(id) || 0) + item.quantity);
  }
  for (const [id, quantity] of quantities) {
    const watch = byId.get(id);
    if (quantity > watch.stock)
      throw new AppError(409, `${watch.name} has insufficient stock.`);
  }
  return pricedItems;
}

export function calculateOrderAmounts(items, deliveryMethod = "standard") {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const gstAmount = Math.round(subtotal * GST_RATE);
  const deliveryAmount = deliveryMethod === "express" ? 499 : 0;
  return {
    subtotal,
    gstRate: GST_RATE,
    gstAmount,
    deliveryAmount,
    totalAmount: subtotal + gstAmount + deliveryAmount,
  };
}

export function toPaise(rupees) {
  if (!Number.isSafeInteger(rupees) || rupees < 0)
    throw new RangeError(
      "Amount must be a non-negative whole number of rupees.",
    );
  return rupees * 100;
}
