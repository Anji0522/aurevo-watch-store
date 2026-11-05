import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const apiBase = import.meta.env.VITE_API_URL || "";
const welcome = "Hello, I’m Aria, your AUREVO guide. I can help you explore the collection, compare timepieces, or explain a specification. Want a quick tour? You can also sign up or log in whenever you like—never required to browse.";

function parseEvent(block) {
  let event = "message";
  const data = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  return { event, data: data.join("\n") };
}

export default function AriaWidget({ products, onAdd }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("aurevo_aria_welcomed") !== "true") {
        setMessages([{ role: "assistant", content: welcome, welcome: true }]);
        window.localStorage.setItem("aurevo_aria_welcomed", "true");
      } else {
        setMessages([{ role: "assistant", content: "Welcome back. I can help compare timepieces or explain their listed specifications. What would you like to know?" }]);
      }
    } catch {
      setMessages([{ role: "assistant", content: welcome, welcome: true }]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || loading) return;
    const history = messages.filter((entry) => !entry.pending).slice(-8).map(({ role, content }) => ({ role, content }));
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }, { role: "assistant", content: "", pending: true }]);
    let responseText = "";

    const append = (value) => {
      responseText += value;
      setMessages((current) => current.map((entry, index) => index === current.length - 1 ? { ...entry, content: responseText } : entry));
    };

    try {
      const csrfResponse = await fetch(`${apiBase}/api/auth/csrf`, { credentials: "include" });
      if (!csrfResponse.ok) throw new Error("Could not start a secure Aria session.");
      const { csrfToken } = await csrfResponse.json();
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ message, history }),
      });
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || "Aria is unavailable right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = false;
      while (!complete) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, "\n");
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const parsed = parseEvent(block);
          if (parsed.data) {
            const payload = JSON.parse(parsed.data);
            if (parsed.event === "token") append(payload.text);
            if (parsed.event === "fallback") {
              responseText = payload.text;
              setMessages((current) => current.map((entry, index) => index === current.length - 1 ? { ...entry, content: responseText } : entry));
            }
            if (parsed.event === "done") complete = true;
          }
          boundary = buffer.indexOf("\n\n");
        }
        if (done) complete = true;
      }

      const requestsAdd = /\b(add|put|place|include|bag|cart)\b/i.test(message);
      const suggestedWatch = requestsAdd
        ? products.find((watch) => responseText.toLowerCase().includes(watch.name.toLowerCase()) || responseText.toLowerCase().includes(watch.slug))
        : null;
      setMessages((current) => current.map((entry, index) => index === current.length - 1 ? { ...entry, pending: false, suggestedWatch } : entry));
    } catch {
      const fallback = "I’m sorry, I couldn’t connect just now. Please try again or contact us for confirmed information.";
      setMessages((current) => current.map((entry, index) => index === current.length - 1 ? { ...entry, content: fallback, pending: false } : entry));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="aria-widget">
      <AnimatePresence>
        {open && (
          <motion.section className="aria-panel" role="dialog" aria-modal="false" aria-labelledby="aria-title" initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.97 }}>
            <header className="aria-header"><div><span className="aria-status" /><div><h2 id="aria-title">Aria</h2><span>Your AUREVO guide</span></div></div><button onClick={() => setOpen(false)} aria-label="Close Aria chat">×</button></header>
            <div className="aria-messages" ref={scrollRef} aria-live="polite">
              {messages.map((entry, index) => (
                <div className={`aria-message ${entry.role}`} key={`${index}-${entry.role}`}>
                  <p>{entry.content || (entry.pending ? "Aria is thinking…" : "")}</p>
                  {entry.welcome && <div className="aria-welcome-actions"><button onClick={() => sendMessage("Please give me a quick tour of the AUREVO collection.")}>Take a quick tour</button><a href="#account" onClick={() => setOpen(false)}>Sign up or log in</a></div>}
                  {entry.suggestedWatch && <button className="aria-add" onClick={() => onAdd(entry.suggestedWatch)}>Add {entry.suggestedWatch.name} to bag</button>}
                </div>
              ))}
            </div>
            <form className="aria-form" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
              <label className="sr-only" htmlFor="aria-message">Message Aria</label>
              <input id="aria-message" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Aria anything…" maxLength={1600} disabled={loading} />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Send message">↗</button>
            </form>
            <span className="aria-footnote">Aria shares confirmed catalogue and policy details only.</span>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button className="aria-launcher" whileTap={{ scale: 0.92 }} onClick={() => setOpen((value) => !value)} aria-label={open ? "Close Aria" : "Chat with Aria"} aria-expanded={open}>
        <span className="aria-spark">✳</span>{open ? "Close" : "Ask Aria"}
      </motion.button>
    </div>
  );
}
