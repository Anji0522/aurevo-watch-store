import { Router } from "express";
import { body } from "express-validator";
import { rateLimit } from "express-rate-limit";
import { optionalAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/errors.js";
import { buildAriaSystemPrompt, createAnthropicClient, getAssistantContext } from "../services/aria.js";

const router = Router();
const ariaLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Aria is taking a short pause. Please try again in a few minutes." },
});

function sendEvent(res, event, payload) {
  if (!res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

router.post("/chat", ariaLimiter, optionalAuth, [
  body("message").trim().isLength({ min: 1, max: 1600 }).withMessage("Message must be under 1,600 characters."),
  body("history").optional().isArray({ max: 8 }).withMessage("Conversation history is too long."),
  body("history.*.role").optional().isIn(["user", "assistant"]).withMessage("Invalid conversation role."),
  body("history.*.content").optional().isString().isLength({ min: 1, max: 1600 }).withMessage("Conversation message is too long."),
  validateRequest,
], async (req, res, next) => {
  let stream;
  let completed = false;
  const abortController = new AbortController();
  res.on("close", () => {
    if (!completed) abortController.abort();
  });

  try {
    const client = createAnthropicClient();
    res.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    if (!client) {
      sendEvent(res, "fallback", { text: "I’m taking a little pause right now. I can’t connect to the watch catalogue assistant yet, but you can still explore the collection or contact us for confirmed details." });
      sendEvent(res, "done", {});
      completed = true;
      return res.end();
    }

    const context = await getAssistantContext(req.user);
    const history = (req.body.history || []).slice(-8).map(({ role, content }) => ({ role, content }));
    history.push({ role: "user", content: req.body.message });
    stream = client.messages.stream({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 700,
      system: buildAriaSystemPrompt(context),
      messages: history,
    }, { signal: abortController.signal });
    stream.on("text", (text) => sendEvent(res, "token", { text }));
    await stream.finalMessage();
    sendEvent(res, "done", {});
    completed = true;
    res.end();
  } catch (error) {
    if (abortController.signal.aborted) return;
    if (res.headersSent) {
      console.error("Aria response failed:", error.message);
      sendEvent(res, "fallback", { text: "I’m sorry, I couldn’t finish that just now. Please try again or contact us for confirmed information." });
      sendEvent(res, "done", {});
      completed = true;
      return res.end();
    }
    next(error);
  }
});

export default router;
