const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*" })); // tighten later
app.use(express.json());

// Routes
const testCrudRoutes = require("./routes/TestCrudRoutes");
app.use("/api/test-crud", testCrudRoutes);

const authRoutes = require("./routes/AuthRoutes");
app.use("/api/auth", authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
