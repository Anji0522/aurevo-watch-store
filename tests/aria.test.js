import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { buildAriaSystemPrompt, createAnthropicClient } from "../server/services/aria.js";

test("Aria prompt is grounded in supplied catalogue and explicit policies", () => {
  const prompt = buildAriaSystemPrompt({
    catalog: [{ name: "Aurevo Chronos", priceINR: 48500, stock: 12, specs: { movement: "automatic" } }],
    demoMode: true,
    orders: [],
  });
  assert.match(prompt, /Aurevo Chronos/);
  assert.match(prompt, /48500/);
  assert.match(prompt, /DEMO DATA ONLY/);
  assert.match(prompt, /Returns, cancellations, delivery timelines, and support contact details are not yet configured/);
  assert.match(prompt, /Never guess or extrapolate/);
  assert.match(prompt, /There is no cash payment/);
});

test("Aria prompt limits order tracking context to the supplied signed-in orders", () => {
  const prompt = buildAriaSystemPrompt({
    catalog: [],
    demoMode: false,
    orders: [{ _id: "order-1", status: "shipped", paymentStatus: "paid", statusTimeline: [] }],
  });
  assert.match(prompt, /order-1/);
  assert.doesNotMatch(prompt, /address|pincode/i);
  assert.match(buildAriaSystemPrompt({ catalog: [], demoMode: false, orders: [] }), /No signed-in order data is available/);
});

test("Anthropic client fails closed when credentials or model are absent", () => {
  const previous = {
    key: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL,
  };
  process.env.ANTHROPIC_API_KEY = "";
  process.env.ANTHROPIC_MODEL = "";
  assert.equal(createAnthropicClient(), null);
  if (previous.key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previous.key;
  if (previous.model === undefined) delete process.env.ANTHROPIC_MODEL;
  else process.env.ANTHROPIC_MODEL = previous.model;
});

test("AI endpoint returns an explicit streaming fallback when API credentials are absent", async () => {
  process.env.NODE_ENV = "test";
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousModel = process.env.ANTHROPIC_MODEL;
  process.env.ANTHROPIC_API_KEY = "";
  process.env.ANTHROPIC_MODEL = "";
  const { default: app } = await import("../server/index.js");
  const csrf = await request(app).get("/api/auth/csrf");
  const cookie = csrf.headers["set-cookie"][0].split(";")[0];
  const response = await request(app)
    .post("/api/ai/chat")
    .set("Cookie", cookie)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ message: "Can you recommend a watch?" });
  if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousKey;
  if (previousModel === undefined) delete process.env.ANTHROPIC_MODEL;
  else process.env.ANTHROPIC_MODEL = previousModel;
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/event-stream/);
  assert.match(response.text, /event: fallback/);
  assert.match(response.text, /event: done/);
});
