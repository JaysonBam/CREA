// --- Core Dependencies ---
// Import the Express framework to create and manage the router.
const express = require("express");
// Create a new router object to handle requests.
const router = express.Router();

// --- Controller Imports ---
// Import the primary controller for handling the main CRUD operations for issue reports.
const controller = require("../controllers//IssueReportController");
// Import the controller responsible for chat messages within an issue report.
const messageController = require("../controllers/MessageController");
// Import the controller for managing the read/unread status of issue report chats.
const readController = require("../controllers/IssueChatReadController");

// --- Middleware Imports ---
// Import the authentication middleware. This function will be used to protect routes,
// ensuring that a user must have a valid JSON Web Token (JWT) to access them.
const auth = require("../middleware/auth");

// The base path for all routes defined in this file is /api/issue-reports,
// as configured in the main server application file (e.g., app.js or server.js).

// --- Route Definitions ---

// GET /api/issue-reports
// Lists all issue reports, with support for filtering. `auth` middleware is executed first.
router.get("/", auth, controller.list);

// IMPORTANT: Routes that are not parameterized (like '/unread') must be placed
// BEFORE parameterized routes (like '/:token'). Otherwise, Express would interpret
// 'unread' as a value for the ':token' parameter.

router.post("/watchlist/:token", auth, controller.subscribeWatchlist);
router.delete("/watchlist/:token", auth, controller.unsubscribeWatchlist);
router.get("/watchlist", auth, controller.getWatchlist);
// GET /api/issue-reports/unread
// Retrieves a count of unread messages for the authenticated user across different issue reports.
router.get("/unread", auth, messageController.unreadCounts);

// GET /api/issue-reports/title-suggestions
// Provides a list of matching titles for a global autocomplete feature.
router.get("/title-suggestions", auth, controller.titleSuggestions);

// GET /api/issue-reports/user/:userToken
// Retrieves all issue reports created by a specific user, identified by their token.
router.get("/user/:userToken", auth, controller.getUserReports);

// GET /api/issue-reports/user/:userToken/title-suggestions
// Provides title suggestions for autocomplete, but scoped only to a specific user's reports.
router.get(
  "/user/:userToken/title-suggestions",
  auth,
  controller.titleSuggestionsForUser
);

// GET /api/issue-reports/:token
// Retrieves a single, specific issue report by its unique token.
router.get("/:token", auth, controller.getOne);

// POST /api/issue-reports/
// Creates a new issue report.
router.post("/", auth, controller.create);

// PUT /api/issue-reports/:token
// Updates an existing issue report.
router.put("/:token", auth, controller.update);

// DELETE /api/issue-reports/:token
// Deletes an issue report.
router.delete("/:token", auth, controller.remove);

// --- Nested Routes for Messages within an Issue Report ---

// GET /api/issue-reports/:token/messages
// Fetches all chat messages associated with a specific issue report.
router.get("/:token/messages", auth, messageController.listForIssue);

// POST /api/issue-reports/:token/messages
// Creates a new chat message within a specific issue report.
router.post("/:token/messages", auth, messageController.createForIssue);

// GET /api/issue-reports/:token/messages/read
// Gets the timestamp of when the user last read the messages in this issue's chat.
router.get("/:token/messages/read", auth, readController.get);

// PUT /api/issue-reports/:token/messages/read
// Creates or updates the timestamp for when a user read the messages (marks the chat as "read").
router.put("/:token/messages/read", auth, readController.upsert);

// Export the router so it can be mounted by the main Express application.
module.exports = router;
