const {
  sequelize,
  MaintenanceSchedule,
  IssueReport,
  User,
  Location,
  FileAttachment,
  Ward,
  ReportIssueWatchlist,
  Resident,
  MunicipalStaff,
  CommunityLeader,
} = require("../models");

const {
  renderIssueLeaderEmail,
  renderIssueStatusEmail,
} = require("../services/emailRenderer");

const { sendEmailAsync } = require("../services/emailService");

function toISOOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(+d) ? null : d.toISOString();
}

module.exports = {
  //Function to list all MaintenanceSchedule records
  async list(req, res) {
    try {
      const { issueToken } = req.query;
      const where = {};

      if (issueToken) {
        const issue = await IssueReport.findOne({
          where: { token: issueToken },
          attributes: ["id"],
        });
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

  //Function to get one instance of the MaintenanceSchedule model using a token
  async getOne(req, res) {
    try {
      const row = await MaintenanceSchedule.findOne({
        where: { token: req.params.token },
      });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
  //Function to create a new MaintenanceSchedule record
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { issueToken, description, date_time_from, date_time_to } =
        req.body;

      if (!issueToken)
        return res.status(400).json({ error: "issueToken is required" });
      if (!description?.trim())
        return res.status(400).json({ error: "description is required" });
      if (!date_time_from || !date_time_to)
        return res
          .status(400)
          .json({ error: "date_time_from and date_time_to are required" });

      const from = new Date(date_time_from);
      const to = new Date(date_time_to);
      if (isNaN(+from) || isNaN(+to))
        return res.status(400).json({ error: "Invalid dates" });
      if (to < from)
        return res
          .status(400)
          .json({ error: "date_time_to must be after date_time_from" });

      // Lock issue for atomic schedule creation + optional status change
      const issue = await IssueReport.findOne({
        where: { token: issueToken },
        attributes: [
          "id",
          "status",
          "title",
          "category",
          "description",
          "user_id",
          "location_id",
          "ward_id",
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!issue) {
        await t.rollback();
        return res.status(404).json({ error: "Issue not found" });
      }

      const created = await MaintenanceSchedule.create(
        {
          issueReportId: issue.id,
          description: description.trim(),
          date_time_from: from,
          date_time_to: to,
        },
        { transaction: t }
      );

      const prevStatus = issue.status;
      const shouldPromote =
        issue.status !== "RESOLVED" && issue.status !== "IN_PROGRESS";

      if (shouldPromote) {
        await IssueReport.update(
          { status: "IN_PROGRESS" },
          { where: { id: issue.id }, transaction: t }
        );
      }

      await t.commit();

      // === EMAIL: always send after successful create ===
      const newStatus = shouldPromote ? "IN_PROGRESS" : prevStatus;

      const reporter = await issue.getUser({
        attributes: ["first_name", "last_name", "email"],
      });

      const location = await issue.getLocation({
        attributes: ["address", "latitude", "longitude"],
      });

      const ward = await issue.getWard({
        attributes: ["code", "name"],
      });
      // Replace the findAll(...) with:
      const watchlist = await ReportIssueWatchlist.findAll({
        where: { report_issue_id: issue.id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["email", "first_name", "last_name"],
          },
        ],
      });
      const fmt = new Intl.DateTimeFormat("en-ZA", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const emailData = {
        title: issue.title,
        category: issue.category,
        oldStatus: prevStatus || "UNKNOWN",
        newStatus,
        reporterName: reporter
          ? `${reporter.first_name ?? ""} ${reporter.last_name ?? ""}`.trim() ||
            "Unknown"
          : "Unknown",
        reporterEmail: reporter?.email ?? "unknown",
        wardCode: ward?.code ?? ward?.name ?? "—",
        description: issue.description || "—",
        address: location?.address ?? "—",
        latitude: location?.latitude ?? "—",
        longitude: location?.longitude ?? "—",
        mapsLink:
          location?.latitude && location?.longitude
            ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
            : "",
        changedAt: fmt.format(new Date()),
      };

      const html = await renderIssueStatusEmail(emailData);

      const recipients = Array.from(
        new Set(
          (watchlist || [])
            .map((w) => w.user?.email)
            .filter((e) => typeof e === "string" && e.includes("@"))
        )
      );

      if (recipients.length > 0) {
        const subject = `Status updated: ${emailData.title} (${emailData.oldStatus} → ${emailData.newStatus})`;
        await Promise.all(
          recipients.map((to) =>
            sendEmailAsync({
              to,
              subject,
              html,
            })
          )
        );
      }
      // === END EMAIL ===

      return res.status(201).json(created);
    } catch (e) {
      await t.rollback();
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  },

  //Function to update existing MaintenanceSchedule
  async update(req, res) {
    try {
      const row = await MaintenanceSchedule.findOne({
        where: { token: req.params.token },
      });
      if (!row) return res.status(404).json({ error: "Not found" });

      const { description, date_time_from, date_time_to } = req.body;
      const patch = {};

      if (typeof description === "string")
        patch.description = description.trim();

      let from = row.date_time_from;
      let to = row.date_time_to;

      if (date_time_from) {
        const d = new Date(date_time_from);
        if (isNaN(+d))
          return res.status(400).json({ error: "Invalid date_time_from" });
        from = d;
        patch.date_time_from = d;
      }

      if (date_time_to) {
        const d = new Date(date_time_to);
        if (isNaN(+d))
          return res.status(400).json({ error: "Invalid date_time_to" });
        to = d;
        patch.date_time_to = d;
      }

      if (from && to && to < from)
        return res
          .status(400)
          .json({ error: "date_time_to must be after date_time_from" });

      await row.update(patch);
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  //Function to remove MaintenanceSchedule record
  async remove(req, res) {
    try {
      const count = await MaintenanceSchedule.destroy({
        where: { token: req.params.token },
      });
      if (!count) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};
