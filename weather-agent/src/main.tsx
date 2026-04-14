import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/**
 * Application entry point.
 *
 * This file:
 * 1. Imports React's StrictMode which enables extra development warnings
 * 2. Imports createRoot from React DOM to attach the app to the HTML page
 * 3. Finds the HTML element with id="root" and mounts the App component there
 *
 * StrictMode helps catch common mistakes and unsafe patterns during development
 * (it's disabled in production). It's useful but doesn't affect the app's behavior
 * for users in production.
 *
 * The app starts with the App component (see App.tsx for the main logic).
 */

// Find the HTML element where React will render the app
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id="root" not found in HTML');
}

// Create the React app and render it
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
