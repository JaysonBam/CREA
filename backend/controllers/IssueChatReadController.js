const { IssueReport, IssueChatRead } = require("../models");

async function getIssueByTokenOr404(token, res) {
  const issue = await IssueReport.findOne({ where: { token } });
  if (!issue) {
    res.status(404).json({ error: "Issue report not found" });
    return null;
  }
  return issue;
}

module.exports = {
  async get(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const issue = await getIssueByTokenOr404(req.params.token, res);
      if (!issue) return;

      const row = await IssueChatRead.findOne({ where: { issue_report_id: issue.id, user_id: userId } });
      res.json({ last_seen_at: row?.last_seen_at || null });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
  async upsert(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const issue = await getIssueByTokenOr404(req.params.token, res);
      if (!issue) return;

      const when = req.body?.last_seen_at ? new Date(req.body.last_seen_at) : new Date();
      const [row] = await IssueChatRead.findOrCreate({
        where: { issue_report_id: issue.id, user_id: userId },
        defaults: { last_seen_at: when },
      });
      if (row.last_seen_at == null || row.last_seen_at < when) {
        await row.update({ last_seen_at: when });
      }

      try {
        const { getIO } = require('../services/socket');
        const io = getIO();
        // Let others in the issue room know this user has read up to 'when'
        io.to(`issue:${issue.token}`).emit('message:read', { issueToken: issue.token, userId, last_seen_at: when });
        // Also notify this user to refresh unread counts everywhere
        io.to(`user:${userId}`).emit('unread:invalidate', { issueToken: issue.token });
      } catch (_) {
        // sockets optional
      }

      res.json({ last_seen_at: row.last_seen_at });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};
