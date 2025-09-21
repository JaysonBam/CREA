// --- Core Dependencies ---
// Import the necessary models from the database configuration.
const { FileAttachment, IssueReport, User } = require('../models');
// Import multer, a middleware for handling multipart/form-data, used for file uploads.
const multer = require('multer');
// Specifically import MulterError to handle upload-specific errors gracefully.
const { MulterError } = require('multer');
// Import Node.js built-in modules for handling file paths and the file system.
const path = require('path');
const fs = require('fs');

// --- Multer Configuration for File Uploads ---

// Define the storage engine for multer. 'diskStorage' gives full control over storing files to disk.
const storage = multer.diskStorage({
  /**
   * destination: A function that determines the folder where uploaded files should be stored.
   * @param {object} req - The Express request object.
   * @param {object} file - The file being uploaded.
   * @param {function} cb - A callback function to pass the destination path.
   */
  destination: (req, file, cb) => {
    // Define the target directory for uploads.
    const dir = 'uploads/';
    // Check if the directory exists, and create it if it doesn't. This prevents errors.
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    // Pass the destination directory to the callback. The first argument is for an error (null here).
    cb(null, dir);
  },
  /**
   * filename: A function that determines the name of the file inside the destination folder.
   * @param {object} req - The Express request object.
   * @param {object} file - The file being uploaded.
   * @param {function} cb - A callback function to pass the final filename.
   */
  filename: (req, file, cb) => {
    // Create a unique filename using the current timestamp to prevent file name collisions.
    // path.extname(file.originalname) extracts the original file's extension.
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Create the multer instance, configuring it to use the disk storage engine defined above.
const upload = multer({ storage: storage });

// Export the 'upload' instance. This will be used as middleware in the route definition
// to process file uploads before the main controller logic is executed.
exports.upload = upload;

// --- Controller Functions ---

/**
 * CREATE a new file attachment and associate it with an IssueReport.
 * This function handles the request after multer has processed the file uploads.
 */
exports.create = async (req, res) => {
    // The uploaded file details are available in `req.files`, and form fields in `req.body`.
  const { issue_report_token, description } = req.body;
  const files = req.files;

  // --- Input Validation ---
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files were uploaded.' });
  }
  if (!issue_report_token) {
    return res.status(400).json({ error: 'Issue report token is required.' });
  }

  try {
    // Find the parent IssueReport using its unique token to establish the relationship.
    const issueReport = await IssueReport.findOne({ where: { token: issue_report_token } });
    if (!issueReport) {
      return res.status(404).json({ error: 'IssueReport not found.' });
    }

    // Map over the array of uploaded files to prepare their data for database insertion.
    const attachmentsData = files.map(file => ({
      file_link: `/uploads/${file.filename}`, // Store a relative URL path to the file.
      description: description || file.originalname, // Use provided description or default to original filename.
      issue_report_id: issueReport.id, // Foreign key to link with the IssueReport.
      user_id: req.user.user_id, // Assumes authentication middleware has attached user info to the request.
    }));

    // Use `bulkCreate` for efficiency. It inserts multiple records into the database in a single query.
    const newAttachments = await FileAttachment.bulkCreate(attachmentsData);

    // Respond with the newly created attachment records.
    res.status(201).json(newAttachments);
  } catch (e) {
    console.error("Failed to create file attachment:", e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * LIST all file attachments in the database.
 * This provides an overview of all uploaded files.
 */
exports.list = async (req, res) => {
  try {
    // Fetch all records from the FileAttachment table.
    const rows = await FileAttachment.findAll({
      // Use `include` to perform a JOIN with related tables (User and IssueReport).
      // This "eager loads" the associated data, making the response more informative.
      include: [
        { model: User, as: 'user', attributes: ['token', 'email'] }, // Include uploader's info.
        { model: IssueReport, as: 'issueReport', attributes: ['token', 'title'] } // Include parent report's info.
      ],
      // Order the results by creation date in descending order to show the newest files first.
      order: [['createdAt', 'DESC']]
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET a single file attachment by its unique token.
 */
exports.getOne = async (req, res) => {
  try {
    // Find one record where the 'token' matches the one from the URL parameters.
    const row = await FileAttachment.findOne({ where: { token: req.params.token } });
    if (!row) {
      return res.status(404).json({ error: 'FileAttachment not found' });
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * UPDATE a file attachment's metadata (e.g., its description).
 * This does not allow changing the file itself.
 */
exports.update = async (req, res) => {
  try {
    const row = await FileAttachment.findOne({ where: { token: req.params.token } });
    if (!row) {
      return res.status(404).json({ error: 'FileAttachment not found' });
    }

    // Selectively update fields. Only update the description if it was provided in the request body.
    const { description } = req.body;
    if (description !== undefined) {
      row.description = description;
    }
    
    // Save the changes to the database.
    await row.save();
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * DELETE a file attachment record and its corresponding physical file.
 */
exports.remove = async (req, res) => {
  try {
    // First, find the database record for the attachment.
    const row = await FileAttachment.findOne({ where: { token: req.params.token } });
    if (!row) {
      return res.status(404).json({ error: 'FileAttachment not found' });
    }

    // CRITICAL: Before deleting the database record, delete the actual file from the server's filesystem.
    // Construct the absolute file path from the relative path stored in the database.
    const filePath = path.join(__dirname, '..', row.file_link);
    // Check if the file exists and then delete it.
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // After successfully deleting the file, destroy the database record.
    await row.destroy();
    // Respond with a 204 "No Content" status, which is standard for successful deletions.
    res.status(204).send();
  } catch (e) {
    console.error("Failed to delete file:", e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * Custom Error Handling Middleware for Multer.
 * This function is designed to be used in the router to catch and format errors
 * that occur specifically during the file upload process managed by multer.
 */
exports.handleUploadErrors = (err, req, res, next) => {
  // Check if the error is an instance of a MulterError.
  if (err instanceof MulterError) {
    console.error("Multer Error:", err);
    // Respond with a structured error message that is helpful for the client/frontend.
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
      field: err.field, // Indicates which form field caused the error.
    });
  } else if (err) {
    // Handle other, unexpected errors that might occur during the upload.
    console.error("Unknown upload error:", err);
    return res.status(500).json({ error: "An unknown error occurred during file upload." });
  }
  // If there are no errors, pass control to the next middleware in the stack.
  next();
};