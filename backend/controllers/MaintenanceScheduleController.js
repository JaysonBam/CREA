const { MaintenanceSchedule, IssueReport } = require("../models");

function toISOOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(+d) ? null : d.toISOString();
}

module.exports = {
  // GET /api/maintenance-schedules?issueToken=...
  async list(req, res) {
    try {
      const { issueToken } = req.query;
      const where = {};

      if (issueToken) {
        const issue = await IssueReport.findOne({ where: { token: issueToken }, attributes: ["id"] });
        if (!issue) return res.status(404).json({ error: "Issue not found" });
        where.issueReportId = issue.id;
      }

      const rows = await MaintenanceSchedule.findAll({
        where,
        order: [["date_time_from", "DESC"]],
      });

      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  },

  // GET /api/maintenance-schedules/:token
  async getOne(req, res) {
    try {
      const row = await MaintenanceSchedule.findOne({ where: { token: req.params.token } });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  // POST /api/maintenance-schedules
  // body: { issueToken, description, date_time_from, date_time_to }
  async create(req, res) {
    try {
      const { issueToken, description, date_time_from, date_time_to } = req.body;

      if (!issueToken) return res.status(400).json({ error: "issueToken is required" });
      if (!description?.trim()) return res.status(400).json({ error: "description is required" });
      if (!date_time_from || !date_time_to) return res.status(400).json({ error: "date_time_from and date_time_to are required" });

      const from = new Date(date_time_from);
      const to = new Date(date_time_to);
      if (isNaN(+from) || isNaN(+to)) return res.status(400).json({ error: "Invalid dates" });
      if (to < from) return res.status(400).json({ error: "date_time_to must be after date_time_from" });

      const issue = await IssueReport.findOne({ where: { token: issueToken }, attributes: ["id"] });
      if (!issue) return res.status(404).json({ error: "Issue not found" });

      const created = await MaintenanceSchedule.create({
        issueReportId: issue.id,
        description: description.trim(),
        date_time_from: from,
        date_time_to: to,
      });

      res.status(201).json(created);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  },

  // PUT /api/maintenance-schedules/:token
  // body: { description?, date_time_from?, date_time_to? }
  async update(req, res) {
    try {
      const row = await MaintenanceSchedule.findOne({ where: { token: req.params.token } });
      if (!row) return res.status(404).json({ error: "Not found" });

      const { description, date_time_from, date_time_to } = req.body;
      const patch = {};

      if (typeof description === "string") patch.description = description.trim();

      let from = row.date_time_from;
      let to = row.date_time_to;

      if (date_time_from) {
        const d = new Date(date_time_from);
        if (isNaN(+d)) return res.status(400).json({ error: "Invalid date_time_from" });
        from = d;
        patch.date_time_from = d;
      }

      if (date_time_to) {
        const d = new Date(date_time_to);
        if (isNaN(+d)) return res.status(400).json({ error: "Invalid date_time_to" });
        to = d;
        patch.date_time_to = d;
      }

      if (from && to && to < from) return res.status(400).json({ error: "date_time_to must be after date_time_from" });

      await row.update(patch);
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  // DELETE /api/maintenance-schedules/:token
  async remove(req, res) {
    try {
      const count = await MaintenanceSchedule.destroy({ where: { token: req.params.token } });
      if (!count) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};
