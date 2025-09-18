const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const BACKEND_HOST = process.env.BACKEND_HOST;
const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = [
  FRONTEND_URL,
];

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

// CHANGE #1: Create a variable for the JSON parser middleware
const jsonParser = express.json();

// CHANGE #2: REMOVE the global `app.use(express.json());`
// app.use(express.json()); // <--- DELETE OR COMMENT OUT THIS LINE

app.use('/uploads', express.static('uploads'));

// Routes
const testCrudRoutes = require("./routes/TestCrudRoutes");
// CHANGE #3: Apply the jsonParser middleware specifically to routes that need it
app.use("/api/test-crud", jsonParser, testCrudRoutes);

const authRoutes = require("./routes/AuthRoutes");
app.use("/api/auth", jsonParser, authRoutes);

const issueReportRoutes = require("./routes/IssueReportRoutes");
app.use("/api/issue-reports", jsonParser, issueReportRoutes);

const fileAttachmentRoutes = require('./routes/FileAttachmentRoutes');
// NOTICE: This route does NOT get the jsonParser. It will be parsed by multer instead.
app.use('/api/file-attachments', fileAttachmentRoutes);


const fs = require("fs");
const path = require("path");

// ... your error logging and app.listen code remains the same ...
app.use((err, req, res, next) => {
  const logFile = path.join(__dirname, "error.log");
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n${
    err.stack
  }\n\n`;

  fs.appendFileSync(logFile, log, "utf8");

  console.error("❌ Internal server error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(BACKEND_PORT, BACKEND_HOST, () => {
  console.log(`✅ Server running on http://${BACKEND_HOST}:${BACKEND_PORT}`);
});