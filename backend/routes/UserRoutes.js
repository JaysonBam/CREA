//UserRoutes
const express = require("express");
const { body, param } = require("express-validator");
const UserController = require("../controllers/UserController");

const router = express.Router();

const createValidators = [
  body("first_name").trim().notEmpty().withMessage("first_name required"),
  body("last_name").trim().notEmpty().withMessage("last_name required"),
  body("email").trim().isEmail().withMessage("valid email required"),
  body("phone").optional().isString(),
  body("role")
    .isIn(["resident", "staff", "communityleader", "admin"])
    .withMessage("role must be one of resident|staff|communityleader|admin"),
  body("password").isLength({ min: 6 }).withMessage("password min 6 chars"),
  body("isActive").optional().isBoolean(),
];

const updateValidators = [
  body("first_name").optional().trim().notEmpty(),
  body("last_name").optional().trim().notEmpty(),
  body("email").optional().trim().isEmail(),
  body("phone").optional().isString(),
  body("role")
    .optional()
    .isIn(["resident", "staff", "communityleader", "admin"]),
  body("isActive").optional().isBoolean(),
  body("password").optional().isLength({ min: 6 }),
];

const idValidator = [param("id").isInt().withMessage("id must be an integer")];

// Routes
router.get("/", UserController.list);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  UserController.login
);

router.get("/:id", idValidator, UserController.get);
router.post("/", createValidators, UserController.create);
router.put("/:id", idValidator.concat(updateValidators), UserController.update);
router.delete("/:id", idValidator, UserController.remove);

module.exports = router;