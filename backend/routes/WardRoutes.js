const express = require("express");
const router = express.Router();
const controller = require("../controllers/WardController");
const auth = require("../middleware/auth");

router.get("/", controller.list);

// CRUD operations
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

// Assign community leader to a ward 
router.post("/:id/leader", controller.assignLeader);

// Manage staff in a ward 
router.post("/:id/staff/:userId", controller.addStaff);
router.delete("/:id/staff/:userId", controller.removeStaff);

// Ward profile
router.get("/:id/profile", controller.profile);

// Ward stats 
router.get("/:id/stats", controller.stats);

module.exports = router;
