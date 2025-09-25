const express = require('express');
const router = express.Router();
const VoteController = require('../controllers/VoteController');
const auth = require('../middleware/auth');

// Cast a vote on an issue
router.post('/:issueToken', auth, VoteController.cast);
// Get vote summary
router.get('/:issueToken/summary', auth, VoteController.summary);

module.exports = router;