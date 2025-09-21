// UserController.js
const { User } = require("../models");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

/** Helpers */
const sanitizeUser = (u) => {
  const data = u.toJSON ? u.toJSON() : { ...u };
  delete data.password;
  return data;
};

module.exports = {
  // GET /api/users
  async list(req, res) {
    const users = await User.findAll({ order: [["createdAt", "DESC"]] });
    res.json(users.map(sanitizeUser));
  },

  // GET /api/users/:id
  async get(req, res) {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitizeUser(user));
  },

  // POST /api/users
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { first_name, last_name, email, phone, role, password, isActive } = req.body;

    // hash password before save (your model stores password directly)
    const passwordHash = await bcrypt.hash(String(password || ""), 10);

    try {
      const user = await User.create({
        first_name,
        last_name,
        email: String(email).toLowerCase().trim(),
        phone,
        role,
        isActive: isActive !== undefined ? !!isActive : true,
        password: passwordHash, // store the hash in your existing `password` column
        token: undefined,       // will use default UUID
      });
      res.status(201).json(sanitizeUser(user));
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "Email already exists" });
      }
      console.error(err);
      res.status(500).json({ error: "Failed to create user" });
    }
  },

  // PUT /api/users/:id
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { first_name, last_name, email, phone, role, isActive, password } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    try {
      if (email !== undefined) user.email = String(email).toLowerCase().trim();
      if (first_name !== undefined) user.first_name = first_name;
      if (last_name !== undefined) user.last_name = last_name;
      if (phone !== undefined) user.phone = phone;
      if (role !== undefined) user.role = role;
      if (isActive !== undefined) user.isActive = !!isActive;
      if (password) user.password = await bcrypt.hash(String(password), 10);

      await user.save();
      res.json(sanitizeUser(user));
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "Email already exists" });
      }
      console.error(err);
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  // DELETE /api/users/:id
  async remove(req, res) {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await user.destroy();
    res.status(204).send();
  },

  // POST /api/users/login
  async login(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email: String(email || "").toLowerCase().trim(), isActive: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password || ""), user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // If you’re issuing JWTs, you can do it here. Otherwise just confirm login.
    res.json({ message: "Login successful", user: sanitizeUser(user) });
  },
};