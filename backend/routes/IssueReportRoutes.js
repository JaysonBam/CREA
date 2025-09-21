const express = require("express");
const router = express.Router();
const controller = require("../controllers//IssueReportController");
const messageController = require("../controllers/MessageController");
const readController = require("../controllers/IssueChatReadController");

//The following line ensures a user has to have a valid JWT token to be able to access the routes
//If auth is specified as an argument
const auth = require("../middleware/auth");

// Base path: /api/issue-reports

router.get("/", auth, controller.list);
// Place non-:token routes BEFORE token routes to avoid matching issues
router.get("/unread", auth, messageController.unreadCounts);
// Title autocomplete suggestions (global)
router.get("/title-suggestions", auth, controller.titleSuggestions);

router.get("/user/:userToken", auth, controller.getUserReports);
router.get("/user/:userToken/title-suggestions", auth, controller.titleSuggestionsForUser);
router.get("/:token", auth, controller.getOne);
router.post("/", auth, controller.create);
router.put("/:token", auth, controller.update);
router.delete("/:token", auth, controller.remove);

// Messages for an Issue Report
router.get("/:token/messages", auth, messageController.listForIssue);
router.post("/:token/messages", auth, messageController.createForIssue);
router.get("/:token/messages/read", auth, readController.get);
router.put("/:token/messages/read", auth, readController.upsert);

module.exports = router;
