const express = require("express");
const router = express.Router();
const controller = require("../controllers/MaintenanceScheduleController");
const auth = require("../middleware/auth");

router.get("/", auth, controller.list);
router.get("/:token", auth, controller.getOne);
router.post("/", auth, controller.create);
router.put("/:token", auth, controller.update);
router.delete("/:token", auth, controller.remove);

module.exports = router;
