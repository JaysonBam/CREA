const express = require("express");
const router = express.Router();
const controller = require("../controllers/AuthController");

// router.post("/register", controller.register);
router.post("/login", controller.verifyCredentials);
router.post("/register", controller.register);
module.exports = router;
