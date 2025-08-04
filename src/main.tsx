import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PWAProvider } from "./context/PWAContext";
import "./globals.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Fatal Error: Root container not found in index.html");
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <PWAProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PWAProvider>
    </BrowserRouter>
  </React.StrictMode>
);