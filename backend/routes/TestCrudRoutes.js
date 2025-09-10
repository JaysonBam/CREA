const express = require("express");
const router = express.Router();
const controller = require("../controllers/TestCrudController");
const auth = require("../middleware/auth");

//The following line ensures a user has to have a valid JWT token to be able to access the routes
//If auth is specified as an argument
router.use(auth);
router.get("/", auth, controller.list);
router.get("/:id", auth, controller.getOne);
router.post("/", auth, controller.create);
router.put("/:id", auth, controller.update);
router.delete("/:id", auth, controller.remove);

module.exports = router;
