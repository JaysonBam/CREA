const express = require("express");
const router = express.Router();
const controller = require("../controllers/AuthController");
const auth = require("../middleware/auth");

// router.post("/register", controller.register);
router.post("/login", controller.verifyCredentials);
router.post("/register", controller.register);
router.get("/me", auth, controller.me);
module.exports = router;
