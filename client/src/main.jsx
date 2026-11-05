import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./pages.css";
import "./theme.css";

try {
  document.documentElement.dataset.theme =
    localStorage.getItem("aurevo-theme") || "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
