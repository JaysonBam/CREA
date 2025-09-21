const express = require("express");
const router = express.Router();
const WardRequestController = require("../controllers/WardRequestController");
const auth = require("../middleware/auth");

router.post("/", auth, WardRequestController.create);
router.get("/", auth, WardRequestController.list);

module.exports = router;
