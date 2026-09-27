import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyUiSettings, loadUiSettings } from "./uiSettings";
import "./styles.css";

applyUiSettings(loadUiSettings());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
