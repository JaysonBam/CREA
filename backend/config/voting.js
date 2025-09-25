// Central place to manage vote weightings and escalation threshold
// Adjust these numbers as product requirements evolve.
module.exports = {
  WEIGHTS: {
    // Resident of the same ward where the issue is located
    SAME_WARD_RESIDENT: 1.0,
    // Resident of a different ward
    OTHER_WARD_RESIDENT: 0.4,
    // Community leader (in same ward) gets slightly amplified influence
    COMMUNITY_LEADER: 1.5,
    // Municipal staff can push visibility but not dominate
    STAFF: 0.8,
    // Admin votes count, but typically they can escalate directly; keep modest
    ADMIN: 1.0,
    // Fallback for unknown role
    DEFAULT: 0.5
  },
  // Minimum accumulated weighted score to flag a report for escalation
  ESCALATION_THRESHOLD: 10,
  // Whether multiple votes from the same user are allowed (recommend false)
  ALLOW_DUPLICATE_VOTES: false
};