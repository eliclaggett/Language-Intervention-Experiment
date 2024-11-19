/*
 * Filename: index.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file wraps the entire web application
 */

// Imports
import React from "react";
import { createRoot } from "react-dom/client";
import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";
import "../node_modules/@empirica/core/dist/player.css";
import App from "./App.jsx";
import "./index.css";

// UI
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
