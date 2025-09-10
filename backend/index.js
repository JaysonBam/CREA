const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;
console.log(FRONTEND_URL);
const allowedOrigins = [
  FRONTEND_URL,
  // "https://myapp.com",  //Any external apis
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

app.use(express.json());

// Routes
const testCrudRoutes = require("./routes/TestCrudRoutes");
app.use("/api/test-crud", testCrudRoutes);

const authRoutes = require("./routes/AuthRoutes");
app.use("/api/auth", authRoutes);

// Start server
app.listen(BACKEND_PORT, () => {
  console.log(`✅ Server running on http://localhost:${BACKEND_PORT}`);
});
