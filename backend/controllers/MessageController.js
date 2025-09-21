const { Message, IssueReport, User, IssueChatRead } = require("../models");
const { Op } = require("sequelize");

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

      // Authorization policy: allow any authenticated user to post on a report
      // If you want to restrict, re-enable checks for owner/privileged roles.
      const user = await User.findByPk(userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      // Business rule: if the issue is resolved, treat the thread as closed
      if (issue.status === "RESOLVED") {
        return res.status(409).json({ error: "Thread is closed for resolved issue" });
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
  
  // GET /api/issue-reports/unread?tokens=a,b,c
  async unreadCounts(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tokensParam = req.query.tokens;
      if (!tokensParam) return res.status(400).json({ error: "tokens query parameter is required" });
      const tokens = tokensParam.split(",").map((t) => t.trim()).filter(Boolean);
      if (!tokens.length) return res.status(400).json({ error: "No valid tokens provided" });

  const issues = await IssueReport.findAll({ where: { token: { [Op.in]: tokens } } });
      const byToken = new Map(issues.map((i) => [i.token, i]));
      const issueIds = issues.map((i) => i.id);

  const reads = await IssueChatRead.findAll({ where: { user_id: userId, issue_report_id: { [Op.in]: issueIds } } });
      const lastSeenByIssueId = new Map(reads.map((r) => [r.issue_report_id, r.last_seen_at]));

      // console.log('[unreadCounts]', { userId, tokens, issueIds, reads: reads.length });

      const result = {};
      for (const t of tokens) {
        const issue = byToken.get(t);
        if (!issue) { result[t] = 0; continue; }
        const lastSeen = lastSeenByIssueId.get(issue.id);
        const where = lastSeen
          ? { issue_report_id: issue.id, createdAt: { [Op.gt]: lastSeen }, user_id: { [Op.ne]: userId } }
          : { issue_report_id: issue.id, user_id: { [Op.ne]: userId } };
        // Count unread (all if never seen)
        // eslint-disable-next-line no-await-in-loop
        const count = await Message.count({ where });
        // console.log('[unreadCounts] token', t, 'issue', issue.id, 'lastSeen', lastSeen, 'count', count);
        result[t] = count;
      }

      res.json({ counts: result });
    } catch (e) {
      console.error("Error fetching unread counts:", e);
      res.status(500).json({ error: e.message });
    }
  },
};
