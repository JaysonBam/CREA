const express = require('express');
const router = express.Router();
const controller = require('../controllers/FileAttachmentController');
const auth = require('../middleware/auth');

// Import the pre-configured 'upload' middleware instance directly from the controller.
// This instance has been set up with specific storage and filename logic.
const upload = require('../controllers/FileAttachmentController').upload;

// Base path for all routes in this file: /api/file-attachments

/**
 * @route   POST /api/file-attachments
 * @desc    Upload one or more new files for an issue report.
 * @access  Private
 *
 * This route demonstrates a powerful middleware chain:
 * 1. `auth`: The request is first authenticated.
 * 2. `upload.array('attachments', 5)`: If authentication succeeds, multer processes the request.
 *    - It looks for files in a form field named 'attachments'.
 *    - It will accept a maximum of 5 files in a single request.
 *    - If successful, it saves the files to disk and attaches their info to the `req` object (as `req.files`).
 * 3. `controller.create`: After the files are uploaded, this controller function runs to create the
 *    corresponding database records for the attachments.
 */
router.post('/', auth, upload.array('attachments', 5), controller.create);

// This line registers a custom error-handling middleware for the router.
// It is placed after the POST route that uses multer. If `upload.array` throws an error
// (e.g., file too large, wrong file type), this handler will catch it and send a
// formatted JSON response instead of crashing or sending a generic HTML error page.
router.use(controller.handleUploadErrors);

/**
 * @route   GET /api/file-attachments
 * @desc    Get a list of all file attachments (useful for admin purposes).
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
 * @desc    Update a file attachment's details (e.g., its description).
 * @access  Private
 */
router.put('/:token', auth, controller.update);

/**
 * @route   DELETE /api/file-attachments/:token
 * @desc    Delete a file attachment's database record and its physical file from the server.
 * @access  Private
 */
router.delete('/:token', auth, controller.remove);

module.exports = router;