const express = require('express');
const router = express.Router();
const controller = require('../controllers/FileAttachmentController');
const auth = require('../middleware/auth');

// This imports the pre-configured multer instance from the controller
const upload = require('../controllers/FileAttachmentController').upload;

// Base path: /api/file-attachments

/**
 * @route   POST /api/file-attachments
 * @desc    Upload one or more new files for an issue report.
 *          Expects 'attachments' field for files and 'issue_report_token' in the body.
 * @access  Private
 */
router.post('/', auth, upload.array('attachments', 5), controller.create);

/**
 * @route   GET /api/file-attachments
 * @desc    Get a list of all file attachments (admin purposes).
 * @access  Private
 */
router.get('/', auth, controller.list);

/**
 * @route   GET /api/file-attachments/:token
 * @desc    Get a single file attachment by its token.
 * @access  Private
 */
router.get('/:token', auth, controller.getOne);

/**
 * @route   PUT /api/file-attachments/:token
 * @desc    Update a file attachment's details (e.g., description).
 * @access  Private
 */
router.put('/:token', auth, controller.update);

/**
 * @route   DELETE /api/file-attachments/:token
 * @desc    Delete a file attachment and its corresponding physical file.
 * @access  Private
 */
router.delete('/:token', auth, controller.remove);

module.exports = router;