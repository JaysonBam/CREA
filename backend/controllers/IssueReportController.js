const { TestCrud } = require("../models");

async function findByTokenOr404(token, res) {
  const row = await TestCrud.findOne({ where: { token } });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return row;
}

exports.list = async (_req, res) => {
  try {
    const rows = await TestCrud.findAll({ order: [["id", "ASC"]] });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;
    const created = await TestCrud.create({ title, description, isActive });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;

    const { title, description, isActive } = req.body;
    await row.update({ title, description, isActive });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    await row.destroy();
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
