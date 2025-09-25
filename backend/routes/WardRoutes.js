const express = require("express");
const router = express.Router();
const controller = require("../controllers/WardController");
const auth = require("../middleware/auth");

router.get("/", controller.list);
router.get("/leaders", controller.listWithLeaders);
router.get("/:id", controller.show);

// CRUD operations
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

// Assign community leader to a ward (leave as-is, it worked)
router.post("/:id/leader", controller.assignLeader);

// Bulk manage staff (set/replace list or clear all)
router.post("/:id/staff", controller.setStaff);     // expects body { memberIds: number[] }
router.delete("/:id/staff", controller.clearStaff); // clears all staff for ward
// Get currently assigned staff for a ward (useful to repopulate UI on load/refresh)
router.get("/:id/staff", controller.listStaff);

// Manage staff in a ward (single add/remove via :userId)
router.post("/:id/staff/:userId", controller.addStaff);
router.delete("/:id/staff/:userId", controller.removeStaff);

// Ward profile
router.get("/:id/profile", controller.profile);

// Ward stats 
router.get("/:id/stats", controller.stats);

module.exports = router;
