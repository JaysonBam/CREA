const express = require("express");
const router = express.Router();
const controller = require("../controllers/WardController");
const auth = require("../middleware/auth");

router.get("/", controller.list);

module.exports = router;
