const express = require("express");
const router = express.Router();
const controller = require("../controllers/TestCrudController");

// /api/test-crud
router.get("/", controller.list);
router.get("/:token", controller.getOne);
router.post("/", controller.create);
router.put("/:token", controller.update);
router.delete("/:token", controller.remove);

module.exports = router;
