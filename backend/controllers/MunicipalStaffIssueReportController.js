const { Op } = require("sequelize");
const {
  IssueReport,
  MunicipalStaff,
  MunicipalStaffIssueReport,
  User,
  Ward,
} = require("../models");

/** helper */
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

/** GET /api/issue-reports/:issueToken/staff */
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

/** GET /api/issue-reports/:issueToken/staff/eligible
 *  Staff assignable to this issue (same ward)
 */
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

/** POST /api/issue-reports/:issueToken/staff
 * body: { municipalStaffToken, note? }
 */
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

/** PUT /api/issue-reports/staff/:msirToken
 * body: { note? }
 */
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

/** DELETE /api/issue-reports/staff/:msirToken */
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
