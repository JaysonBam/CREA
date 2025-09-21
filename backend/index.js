const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
// Load environment configuration
// Note we reference the .env variables and not use hardcoded values here
// This is important for security and flexibility
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const BACKEND_HOST = process.env.BACKEND_HOST;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Define allowed origins for CORS (so only your frontend can access the backend)
const allowedOrigins = [
  FRONTEND_URL,
];

// Configure CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ Blocked by CORS: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  })
);

const jsonParser = express.json();


app.use("/uploads", express.static("uploads"));

// Simple health endpoint to verify API is up
app.get('/healthz', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development', time: new Date().toISOString() })
});

// Routes, each in their own file
// Look specifically at TestCrudRoutes.js for an example of how routes are structured
// We append /api/test-crud for example to make the full route /api/test-crud/create, /api/test-crud/list etc
const testCrudRoutes = require("./routes/TestCrudRoutes");
app.use("/api/test-crud", jsonParser, testCrudRoutes);

const authRoutes = require("./routes/AuthRoutes");
app.use("/api/auth", jsonParser, authRoutes);

const issueReportRoutes = require("./routes/IssueReportRoutes");
app.use("/api/issue-reports", jsonParser, issueReportRoutes);

const wardRoutes = require("./routes/WardRoutes");
app.use("/api/wards", jsonParser, wardRoutes);

const userRoutes = require("./routes/UserRoutes");
app.use("/api/users", jsonParser, userRoutes);

const fileAttachmentRoutes = require("./routes/FileAttachmentRoutes");
app.use("/api/file-attachments", fileAttachmentRoutes);

const locationRoutes = require('./routes/LocationRoutes');
app.use('/api/locations', locationRoutes);

const fs = require("fs");
const path = require("path");

app.use((err, req, res, next) => {
  //Log errors to a file called error.log
  const logFile = path.join(__dirname, "error.log");
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n${
    err.stack
  }\n\n`;

  fs.appendFileSync(logFile, log, "utf8");
//Log error to terminal
  console.error("❌ Internal server error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server on configured host/port
app.listen(BACKEND_PORT, BACKEND_HOST, () => {
  console.log(`✅ Server running on http://${BACKEND_HOST}:${BACKEND_PORT}`);
});
