const express = require("express");
const router = express.Router();
const controller = require("../controllers/TestCrudController");

// /api/test-crud

//The following line ensures a user has to have a valid JWT token to be able to access the routes
//If auth is specified as an argument
const auth = require("../middleware/auth");
router.get("/", auth, controller.list);

router.get("/", auth, controller.list);
router.get("/:token", auth, controller.getOne);
router.post("/", auth, controller.create);
router.put("/:token", auth, controller.update);
router.delete("/:token", auth, controller.remove);

module.exports = router;
