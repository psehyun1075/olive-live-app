import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initRum } from "./rum.js";

// RUM은 "렌더 이전"에 init 하는 게 깔끔함
initRum();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
