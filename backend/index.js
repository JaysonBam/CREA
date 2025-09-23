const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app);


// TEMPORARY: Endpoint to trigger migrations on Render
//Invoke-WebRequest -Uri "https://crea-lrsi.onrender.com/run-migrations" -Method POST
app.post('/run-migrations', async (req, res) => {
  try {
    const { exec } = require('child_process');
    exec('npx sequelize-cli db:migrate', (error, stdout, stderr) => {
      if (error) {
        console.error(`Migration error: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
      if (stderr) {
        console.warn(`Migration stderr: ${stderr}`);
      }
      res.json({ message: 'Migration complete', stdout, stderr });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: Endpoint to trigger seeders on Render
//Invoke-WebRequest -Uri "https://crea-lrsi.onrender.com/run-seeders" -Method POST
app.post('/run-seeders', async (req, res) => {
  try {
    const { exec } = require('child_process');
    exec('npx sequelize-cli db:seed:all', (error, stdout, stderr) => {
      if (error) {
        console.error(`Seeder error: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
      if (stderr) {
        console.warn(`Seeder stderr: ${stderr}`);
      }
      res.json({ message: 'Seeding complete', stdout, stderr });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Load environment configuration
// Note we reference the .env variables and not use hardcoded values here
// This is important for security and flexibility
const BACKEND_PORT = process.env.BACKEND_PORT;
const BACKEND_HOST = process.env.BACKEND_HOST;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Define allowed origins for CORS (so only your frontend can access the backend)
const allowedOrigins = [
  FRONTEND_URL,
]

// Log allowed origins once
console.log("CORS allowed origins:", allowedOrigins);
// Configure CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`❌ Blocked by CORS: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const jsonParser = express.json();


app.use("/uploads", express.static("uploads"));
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

const wardRequestRoutes = require("./routes/WardRequestRoutes");
app.use("/api/ward-requests", jsonParser, wardRequestRoutes);

const locationRoutes = require('./routes/LocationRoutes');
app.use('/api/locations', locationRoutes);

const maintenanceScheduleRoutes = require("./routes/MaintenanceScheduleRoutes");
app.use("/api/maintenance-schedules", jsonParser, maintenanceScheduleRoutes);


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

// Socket.IO setup
try {
  const { initSocket } = require('./services/socket');
  initSocket(server, { allowedOrigins });
  console.log('🔌 Socket.IO initialized');
} catch (e) {
  console.warn('⚠️ Socket.IO not initialized:', e.message);
}

// Start the server on configured host/port
server.listen(BACKEND_PORT, BACKEND_HOST, () => {
  console.log(`✅ Server running on http://${BACKEND_HOST}:${BACKEND_PORT}`);
});
