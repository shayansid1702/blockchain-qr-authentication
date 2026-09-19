const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// --- Security & parsing middleware ---
// QR code images are served cross-origin to the frontend, so relax helmet's
// default cross-origin-resource-policy for the /uploads path only.
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// --- Static files: generated QR code images ---
app.use(
  "/uploads",
  (req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "..", "uploads"))
);

// --- Health check ---
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// --- Main API routes ---
app.use("/api", routes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --- Central error handler (must be registered last) ---
app.use(errorHandler);

module.exports = app;
