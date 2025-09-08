const express = require("express");
const router = express.Router();
const controller = require("../controllers/TestCrudController");

// /api/test-crud
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
