const { FileAttachment, IssueReport, User } = require('../models');
const multer = require('multer');
const { MulterError } = require('multer');
const path = require('path');
const fs = require('fs');

// --- Multer Configuration for File Uploads ---

// Define the storage destination and filename logic
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // IMPORTANT: Create this 'uploads' directory in your project's root
    const dir = 'uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to prevent overwriting
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Create the multer instance with the storage configuration
const upload = multer({ storage: storage });

// Export the upload instance so the router can use it as middleware
exports.upload = upload;

// --- Controller Functions ---

/**
 * CREATE a new file attachment and associate it with an IssueReport
 */
exports.create = async (req, res) => {
    console.log("Creating file attachment...");
    console.log(req.body);
    console.log(req.files);
  const { issue_report_token, description } = req.body;
  const files = req.files;

  // Validation
  if (!files || files.length === 0) {
    console.error("No files were uploaded.");
    return res.status(400).json({ error: 'No files were uploaded.' });
  }
  if (!issue_report_token) {
    return res.status(400).json({ error: 'Issue report token is required.' });
  }

  try {
    // Find the parent IssueReport to link to
    const issueReport = await IssueReport.findOne({ where: { token: issue_report_token } });
    if (!issueReport) {
      return res.status(404).json({ error: 'IssueReport not found.' });
    }

    // Prepare attachment data for each uploaded file
    const attachmentsData = files.map(file => ({
      file_link: `/uploads/${file.filename}`, // The path where the file is served
      description: description || file.originalname,
      issue_report_id: issueReport.id,
      user_id: req.user.user_id, // Assumes auth middleware provides req.user
    }));

    // Create all attachments in the database in a single transaction
    const newAttachments = await FileAttachment.bulkCreate(attachmentsData);

    res.status(201).json(newAttachments);
  } catch (e) {
    console.error("Failed to create file attachment:", e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * LIST all file attachments
 */
exports.list = async (req, res) => {
  try {
    const rows = await FileAttachment.findAll({
      include: [
        { model: User, as: 'user', attributes: ['token', 'email'] },
        { model: IssueReport, as: 'issueReport', attributes: ['token', 'title'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET one file attachment by token
 */
exports.getOne = async (req, res) => {
  try {
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
 * UPDATE a file attachment (e.g., its description)
 */
exports.update = async (req, res) => {
  try {
    const row = await FileAttachment.findOne({ where: { token: req.params.token } });
    if (!row) {
      return res.status(404).json({ error: 'FileAttachment not found' });
    }

    // Only update allowed fields
    const { description } = req.body;
    if (description !== undefined) {
      row.description = description;
    }
    
    await row.save();
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * DELETE a file attachment and its physical file
 */
exports.remove = async (req, res) => {
  try {
    const row = await FileAttachment.findOne({ where: { token: req.params.token } });
    if (!row) {
      return res.status(404).json({ error: 'FileAttachment not found' });
    }

    // IMPORTANT: Delete the physical file from the server
    const filePath = path.join(__dirname, '..', row.file_link);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await row.destroy();
    res.status(204).send(); // No content response
  } catch (e) {
    console.error("Failed to delete file:", e);
    res.status(500).json({ error: e.message });
  }
};


exports.handleUploadErrors = (err, req, res, next) => {
  if (err instanceof MulterError) {
    console.error("Multer Error:", err);
    // Send a specific, helpful error message to the frontend
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
      field: err.field,
    });
  } else if (err) {
    console.error("Unknown upload error:", err);
    return res.status(500).json({ error: "An unknown error occurred during file upload." });
  }
  next();
};