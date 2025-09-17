const { IssueReport } = require("../models");
const { User } = require("../models");

async function findByTokenOr404(token, res) {
  const row = await IssueReport.findOne({ where: { token } });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return row;
}

exports.list = async (_req, res) => {
    console.log("Listing issue reports");
  try {
    const rows = await IssueReport.findAll({ order: [["id", "ASC"]] });
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

exports.getUserReports = async (req, res) => {
    try {
        const userToken = req.params.userToken;
        // find user id for given token
        const currUser = await User.findOne({ where: { token: userToken } });
        if (!currUser) {
            return res.status(404).json({ error: "User not found" });
        }
        const userId = currUser.id;

        // find all issue reports for given user id
        const reports = await IssueReport.findAll({ where: { user_id: userId }, order: [["id", "ASC"]] });
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.create = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;
    const created = await IssueReport.create({ title, description, isActive });
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
