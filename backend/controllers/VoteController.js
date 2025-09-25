const { IssueReport, Vote, Resident, Ward, User } = require('../models');
const { WEIGHTS, ESCALATION_THRESHOLD, ALLOW_DUPLICATE_VOTES } = require('../config/voting');
const { Op } = require('sequelize');
const { getIO } = require('../services/socket');

function roleWeight(role) {
  switch (role) {
    case 'communityleader': return WEIGHTS.COMMUNITY_LEADER;
    case 'staff': return WEIGHTS.STAFF;
    case 'admin': return WEIGHTS.ADMIN;
    case 'resident': return WEIGHTS.OTHER_WARD_RESIDENT; // refined later if same ward
    default: return WEIGHTS.DEFAULT;
  }
}

async function computeWeight(user, issue) {
  // base from role
  let w = roleWeight(user.role);
  // For residents/leaders/staff we can check ward proximity
  // Load resident record for user (if any) & ward for issue
  if (['resident','communityleader','staff'].includes(user.role)) {
    let userWardId = null;
    if (user.role === 'resident') {
      const resident = await Resident.findOne({ where: { user_id: user.id } });
      userWardId = resident?.ward_id || null;
    } else if (user.role === 'communityleader') {
      // community leaders may also have a resident role record, fallback to resident
      const resident = await Resident.findOne({ where: { user_id: user.id } });
      userWardId = resident?.ward_id || null;
    }
    if (userWardId && issue.ward_id && userWardId === issue.ward_id) {
      // Same ward bonus override for pure residents
      if (user.role === 'resident') w = WEIGHTS.SAME_WARD_RESIDENT;
      // For staff we do not escalate to same-ward weight intentionally
    }
  }
  return w;
}

async function updateIssueAggregate(issueId) {
  // Recalculate total weighted votes and update issue_reports.votes_count + potential escalation flag
  const votes = await Vote.findAll({ where: { issue_report_id: issueId }, attributes: ['weight'] });
  const total = votes.reduce((sum, v) => sum + (v.weight || 0), 0);
  await IssueReport.update({ votes_count: Math.round(total) }, { where: { id: issueId } });
  // Optional: escalate logic could set a field or emit an event; placeholder only
  if (total >= ESCALATION_THRESHOLD) {
    // Future: create escalation record, trigger notification, etc.
  }
  return total;
}

module.exports = {
  // POST /api/votes/:issueToken
  async cast(req, res) {
    try {
      const issueToken = req.params.issueToken;
      const user = req.user; // auth middleware sets { user_id, role }
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // Normalize user id (JWT payload uses user_id, not id)
      const userId = user.id || user.user_id;
      if (!userId) return res.status(400).json({ error: 'Invalid user payload' });

      const issue = await IssueReport.findOne({ where: { token: issueToken } });
      if (!issue) return res.status(404).json({ error: 'Issue not found' });

      if (issue.status === 'RESOLVED') {
        return res.status(400).json({ error: 'Voting closed for resolved issue' });
      }

      // Prevent duplicate unless allowed
      const existing = await Vote.findOne({ where: { user_id: userId, issue_report_id: issue.id } });
      if (existing && !ALLOW_DUPLICATE_VOTES) {
        return res.status(409).json({ error: 'Already voted' });
      }

      const effectiveUser = { id: userId, role: user.role }; // shape for computeWeight
      const weight = await computeWeight(effectiveUser, issue);
      if (existing && ALLOW_DUPLICATE_VOTES) {
        return res.json({ message: 'Already voted', weight: existing.weight });
      }
      await Vote.create({ user_id: userId, issue_report_id: issue.id, weight });
      const total = await updateIssueAggregate(issue.id);

      // Emit realtime update to others in same issue room and optionally to admins/staff channels later.
      try {
        const io = getIO();
        const payload = {
          issueToken: issue.token,
          total,
            threshold: ESCALATION_THRESHOLD,
          escalated: total >= ESCALATION_THRESHOLD,
        };
        // Emit to specific issue room (if clients join) and also globally so list pages update
        io.to(`issue:${issue.token}`).emit('vote:updated', payload);
        io.emit('vote:updated', payload);
      } catch (e) {
        // socket layer not critical; swallow errors
      }
      return res.json({ success: true, weight, total });
    } catch (e) {
      console.error('Vote cast error', e.message, e.stack);
      return res.status(500).json({ error: 'Failed to cast vote' });
    }
  },

  // GET /api/votes/:issueToken/summary
  async summary(req, res) {
    try {
      const issueToken = req.params.issueToken;
      const issue = await IssueReport.findOne({ where: { token: issueToken } });
      if (!issue) return res.status(404).json({ error: 'Issue not found' });
      const votes = await Vote.findAll({
        where: { issue_report_id: issue.id },
        include: [
          { model: User, as: 'user', attributes: ['id', 'role', 'token'] }
        ]
      });
      const total = votes.reduce((sum, v) => sum + (v.weight || 0), 0);
      return res.json({ total, threshold: ESCALATION_THRESHOLD, count: votes.length, votes });
    } catch (e) {
      console.error('Vote summary error', e.message, e.stack);
      return res.status(500).json({ error: 'Failed to load summary' });
    }
  }
};