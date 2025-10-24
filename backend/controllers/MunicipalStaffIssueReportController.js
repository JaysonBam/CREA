const { Op } = require("sequelize");
const {
  IssueReport,
  MunicipalStaff,
  MunicipalStaffIssueReport,
  User,
  Ward,
  Location,  
} = require("../models");

//helper function to find IssueReport with valid token
async function getIssueByTokenOr404(issueToken, res) {
  const issue = await IssueReport.findOne({
    where: { token: issueToken },
    attributes: ["id", "token", "title", "ward_id"],
    include: [{ model: Ward, as: "ward", attributes: ["id", "name", "code"] }],
  });
  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return null;
  }
  return issue;
}

//List Municipal Staff assigned to Issue
exports.listForIssue = async (req, res, next) => {
  try {
    const issue = await getIssueByTokenOr404(req.params.issueToken, res);
    if (!issue) return;

    const rows = await MunicipalStaffIssueReport.findAll({
      where: { issue_report_id: issue.id },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: MunicipalStaff,
          as: "staff",
          attributes: ["id", "token", "job_description", "ward_id"],
          include: [
            {
              model: User,
              attributes: ["id", "first_name", "last_name", "email"],
            },
          ],
        },
      ],
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
};
//List all staff for ward
exports.listEligibleStaffForIssue = async (req, res, next) => {
  try {
    const issue = await getIssueByTokenOr404(req.params.issueToken, res);
    if (!issue) return;

    const staff = await MunicipalStaff.findAll({
      where: { ward_id: issue.ward_id },
      attributes: ["id", "token", "job_description", "ward_id"],
      include: [{ model: User, attributes: ["id", "first_name", "last_name", "email"] }],
      order: [[User, "first_name", "ASC"]],
    });

    res.json(staff);
  } catch (err) {
    next(err);
  }
};

//Add Municipal staff to Issue
exports.addToIssue = async (req, res, next) => {
  try {
    const issue = await getIssueByTokenOr404(req.params.issueToken, res);
    if (!issue) return;

    const { municipalStaffToken, note } = req.body || {};
    if (!municipalStaffToken) {
      return res.status(400).json({ error: "municipalStaffToken is required" });
    }

    const staff = await MunicipalStaff.findOne({
      where: { token: municipalStaffToken },
      attributes: ["id", "token", "ward_id"],
    });
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    // Only allow assignment if same ward
    if (String(staff.ward_id) !== String(issue.ward_id)) {
      return res.status(400).json({ error: "Staff must belong to the issue's ward" });
    }

    // Prevent duplicates
    const exists = await MunicipalStaffIssueReport.findOne({
      where: { issue_report_id: issue.id, municipal_staff_id: staff.id },
    });
    if (exists) return res.status(200).json(exists);

    const created = await MunicipalStaffIssueReport.create({
      issue_report_id: issue.id,
      municipal_staff_id: staff.id,
      note: note || null,
    });

    const withInclude = await MunicipalStaffIssueReport.findByPk(created.id, {
      include: [
        {
          model: MunicipalStaff,
          as: "staff",
          attributes: ["id", "token", "job_description", "ward_id"],
          include: [{ model: User, attributes: ["id", "first_name", "last_name", "email"] }],
        },
      ],
    });

    res.status(201).json(withInclude);
  } catch (err) {
    next(err);
  }
};

//Update note
exports.updateAssignment = async (req, res, next) => {
  try {
    const row = await MunicipalStaffIssueReport.findOne({
      where: { token: req.params.msirToken },
    });
    if (!row) return res.status(404).json({ error: "Assignment not found" });

    const fields = {};
    if ("note" in req.body) fields.note = req.body.note || null;

    await row.update(fields);
    res.json(row);
  } catch (err) {
    next(err);
  }
};
//Remove staff from Issue report
exports.removeAssignment = async (req, res, next) => {
  try {
    const row = await MunicipalStaffIssueReport.findOne({
      where: { token: req.params.msirToken },
    });
    if (!row) return res.status(404).json({ error: "Assignment not found" });

    await row.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// GET issues for a MunicipalStaff by their token, with next upcoming schedule
// Route example: GET /api/issue-reports/staff/:staffToken
exports.listIssuesForStaff = async (req, res, next) => {
  try {
    const { staffToken } = req.params;
    if (!staffToken) {
      return res.status(400).json({ error: "staffToken is required" });
    }

    // Find the staff member by token
    const staff = await MunicipalStaff.findOne({
      where: { token: staffToken },
      attributes: ["id", "token", "ward_id", "job_description"],
      include: [{ model: User, attributes: ["id", "first_name", "last_name", "email"] }],
    });
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // Fetch all assignment links for this staff member
    const links = await MunicipalStaffIssueReport.findAll({
      where: { municipal_staff_id: staff.id },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: IssueReport,
          as: "issue",
          attributes: [
            "id",
            "token",
            "title",
            "description",
            "category",
            "status",
            "reference_no",
            "votes_count",
            "ward_id",
            "createdAt",
          ],
          include: [
            { model: Ward, as: "ward", attributes: ["id", "name", "code"] },
            { model: Location, as: "location", attributes: ["id", "token", "address", "latitude", "longitude"] },
            // Optional: next upcoming schedule; requires IssueReport.hasMany(MaintenanceSchedule, { as: "schedules" })
            {
              association: "schedules",
              required: false,
              separate: true,
              limit: 1,
              where: { date_time_from: { [Op.gte]: new Date() } },
              order: [["date_time_from", "ASC"]],
              attributes: ["id", "token", "date_time_from", "date_time_to"],
            },
          ],
        },
      ],
    });

    // Shape response
    const data = links.map((link) => {
      const issue = link.issue;
      const nextSchedule = Array.isArray(issue?.schedules) ? issue.schedules[0] : null;

      return {
        msirToken: link.token,
        msirCreatedAt: link.createdAt,
        note: link.note || null,

        issue: issue
          ? {
            token: issue.token,
            title: issue.title,
            description: issue.description,
            category: issue.category,
            status: issue.status,
            reference_no: issue.reference_no || null,
            votes_count: issue.votes_count ?? 0,
            createdAt: issue.createdAt,
            ward: issue.ward ? { id: issue.ward.id, name: issue.ward.name, code: issue.ward.code } : null,
            location: issue.location
              ? {
                token: issue.location.token,
                address: issue.location.address || null,
                latitude: issue.location.latitude,
                longitude: issue.location.longitude,
              }
              : null,
          }
          : null,

        nextSchedule: nextSchedule
          ? {
            token: nextSchedule.token,
            date_time_from: nextSchedule.date_time_from,
            date_time_to: nextSchedule.date_time_to,
          }
          : null,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};