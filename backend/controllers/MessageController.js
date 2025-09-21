const { Message, IssueReport, User } = require("../models");

async function getIssueByTokenOr404(token, res) {
  const issue = await IssueReport.findOne({ where: { token } });
  if (!issue) {
    res.status(404).json({ error: "Issue report not found" });
    return null;
  }
  return issue;
}

module.exports = {
  // GET /api/issue-reports/:token/messages
  async listForIssue(req, res) {
    try {
      const issue = await getIssueByTokenOr404(req.params.token, res);
      if (!issue) return;
      const rows = await Message.findAll({
        where: { issue_report_id: issue.id },
        include: [
          {
            model: User,
            as: "author",
            attributes: ["token", "first_name", "last_name", "email", "role"],
          },
        ],
        order: [["createdAt", "ASC"]],
      });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  // POST /api/issue-reports/:token/messages
  async createForIssue(req, res) {
    try {
      const issue = await getIssueByTokenOr404(req.params.token, res);
      if (!issue) return;

      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Authorization: allow owner or privileged roles to post
      const user = await User.findByPk(userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const isOwner = issue.user_id === userId;
      const isPrivileged = ["staff", "communityleader", "admin"].includes(user.role);
      if (!isOwner && !isPrivileged) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const created = await Message.create({
        issue_report_id: issue.id,
        user_id: userId,
        content: content.trim(),
      });

      const withAuthor = await Message.findByPk(created.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["token", "first_name", "last_name", "email", "role"],
          },
        ],
      });

      res.status(201).json(withAuthor);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};
