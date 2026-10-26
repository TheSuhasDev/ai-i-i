import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/inter";
import "./index.css";
import App from "./App.jsx";
import AuthProvider from "./context/AuthProvider.jsx";

const savedTheme = localStorage.getItem("inventory-theme");
document.documentElement.dataset.theme = savedTheme || (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
