const express = require("express");
const router = express.Router();
const controller = require("../controllers//IssueReportController");

//The following line ensures a user has to have a valid JWT token to be able to access the routes
//If auth is specified as an argument
const auth = require("../middleware/auth");

// Base path: /api/issue-reports

/**
 * @route   GET /api/issue-reports
 * @desc    Get a list of all issue reports.
 *          Can be filtered by map boundaries using query params:
 *          ?sw_lat, sw_lng, ne_lat, ne_lng
 * @access  Private
 */
router.get("/", auth, controller.list);

router.get("/:token", auth, controller.getOne);
router.get("/user/:userToken", auth, controller.getUserReports);
router.post("/", auth, controller.create);
router.put("/:token", auth, controller.update);
router.delete("/:token", auth, controller.remove);

module.exports = router;
