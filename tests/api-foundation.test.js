import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
const { default: app } = await import("../server/index.js");

test("catalog endpoint returns sample watches without invented review metrics", async () => {
  const response = await request(app).get("/api/watches");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 12);
  assert.ok(response.body.every((watch) => watch.price >= 22000 && watch.price <= 250000));
  assert.ok(response.body.every((watch) => watch.rating === 0 && watch.reviewCount === 0));
});

test("catalog filters and sorts validated query parameters", async () => {
  const response = await request(app).get("/api/watches?collection=Sport&sort=price-asc");
  assert.equal(response.status, 200);
  assert.ok(response.body.length > 0);
  assert.ok(response.body.every((watch) => watch.collection === "Sport"));
  assert.deepEqual(response.body.map((watch) => watch.price), [...response.body.map((watch) => watch.price)].sort((a, b) => a - b));
});

test("catalog rejects unsupported filter values", async () => {
  const response = await request(app).get("/api/watches?sort=surprise");
  assert.equal(response.status, 400);
});

test("catalog rejects out-of-range price filters", async () => {
  const response = await request(app).get("/api/watches?minPrice=1");
  assert.equal(response.status, 400);
});

test("catalog detail resolves a watch by slug", async () => {
  const response = await request(app).get("/api/watches/aurevo-chronos");
  assert.equal(response.status, 200);
  assert.equal(response.body.name, "Aurevo Chronos");
  assert.equal(response.body.reviewCount, 0);
});

test("unknown API paths return a JSON 404", async () => {
  const response = await request(app).get("/api/not-a-route");
  assert.equal(response.status, 404);
  assert.match(response.body.error, /Route not found/);
});

test("unsafe requests require the double-submit CSRF token", async () => {
  const response = await request(app).post("/api/auth/logout");
  assert.equal(response.status, 403);
});

test("invalid registration payload is rejected before database access", async () => {
  const csrf = await request(app).get("/api/auth/csrf");
  const cookie = csrf.headers["set-cookie"][0].split(";")[0];
  const response = await request(app)
    .post("/api/auth/register")
    .set("Cookie", cookie)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ name: "A", email: "not-an-email", password: "short" });
  assert.equal(response.status, 400);
});

test("registration fails closed if no JWT signing secret is configured", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "";
  const csrf = await request(app).get("/api/auth/csrf");
  const cookie = csrf.headers["set-cookie"][0].split(";")[0];
  const response = await request(app)
    .post("/api/auth/register")
    .set("Cookie", cookie)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ name: "Aurevo User", email: "user@example.com", password: "correct-horse-battery" });
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
  assert.equal(response.status, 503);
});

test("protected account endpoints reject anonymous requests", async () => {
  const response = await request(app).get("/api/auth/me");
  assert.equal(response.status, 401);
});
