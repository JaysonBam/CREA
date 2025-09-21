const { IssueReport, User, Location, FileAttachment } = require("../models");
const { Op } = require("sequelize"); // Import Sequelize's operators

async function findByTokenOr404(token, res) {
  const row = await IssueReport.findOne({ where: { token } });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return row;
}

/**
 * List issue reports
 * Supports optional filtering via query params:
 * - category: enum string
 * - status: enum string
 * - title or q: substring (case-insensitive) on title
 * - sw_lat, sw_lng, ne_lat, ne_lng: optional location bounding box
 */
exports.list = async (req, res) => {
  // Destructure the bounding box coordinates and filters from the request query
  const { sw_lat, sw_lng, ne_lat, ne_lng, category, status, title, q } = req.query;

  try {
    // Base options for the Sequelize query.
    // We always want to include User and Location data.
    const options = {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["token", "first_name", "last_name", "email"], // Specify attributes for security
        },
        {
          model: Location,
          as: "location",
          required: false, // Use LEFT JOIN to include reports without a location
        },
      ],
      order: [["id", "DESC"]], // Order by most recent
    };

    // Apply simple filters (category, status, title)
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
  const titleTerm = (q || title);
  if (titleTerm) where.title = { [Op.iLike]: `%${titleTerm}%` };
    if (Object.keys(where).length) options.where = where;

    // Check if all four coordinates for the bounding box are provided
    if (sw_lat && sw_lng && ne_lat && ne_lng) {
      console.log("Listing issue reports with location filter");

      // Add a WHERE clause to the Location model include
      options.include[1].where = {
        [Op.and]: [
          {
            latitude: {
              [Op.between]: [parseFloat(sw_lat), parseFloat(ne_lat)],
            },
          },
          {
            longitude: {
              [Op.between]: [parseFloat(sw_lng), parseFloat(ne_lng)],
            },
          },
        ],
      };
      // Make the join required since we are filtering by it
      options.include[1].required = true; 
    } else {
      console.log("Listing all issue reports (no filter)");
    }

    // Execute the query with the constructed options
    const rows = await IssueReport.findAll(options);

    res.json(rows);
  } catch (e) {
    console.error("Failed to list issue reports:", e);
    res.status(500).json({ error: e.message });
  }
};

/** Fetch a single issue report by token */
exports.getOne = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Get reports created by a specific user (by user token).
 * Optional filters: category, status, title or q.
 * Includes attachments with normalized file URLs.
 */
exports.getUserReports = async (req, res) => {
  console.log("Fetching reports for user:", req.params.userToken);
  try {
    const userToken = req.params.userToken;
  const { category, status, title, q } = req.query;
    // find user id for given token
    const currUser = await User.findOne({ where: { token: userToken } });
    if (!currUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = currUser.id;
    console.log("Found user ID:", userId);

    // Build where with filters
    const where = { user_id: userId };
    if (category) where.category = category;
    if (status) where.status = status;
  const titleTerm = (q || title);
  if (titleTerm) where.title = { [Op.iLike]: `%${titleTerm}%` };

    // find all issue reports for given user id and filters
    const reports = await IssueReport.findAll({
      where,
      // Include the associated FileAttachment model
      include: [
        {
          model: FileAttachment,
          as: 'attachments',
          attributes: ['token', 'file_link', 'description'],
          required: false
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const plainReports = reports.map(report => report.get({ plain: true }));
    const baseUrl = process.env.BACKEND_URL || `http://${req.get('host')}`;
    plainReports.forEach(report => {
      if (report.attachments) {
        report.attachments.forEach(attachment => {
          if (attachment.file_link && !/^[a-z]+:\/\//i.test(attachment.file_link)) {
            attachment.file_link = `${baseUrl}${attachment.file_link}`;
          }
        });
      }
    });

    res.json(plainReports);
    console.log(`Found ${plainReports.length} reports for user ${userToken}`);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Title suggestions limited to a given user's reports.
 * Query param: q (partial title).
 */
exports.titleSuggestionsForUser = async (req, res) => {
  try {
    const userToken = req.params.userToken;
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ titles: [] });
    const currUser = await User.findOne({ where: { token: userToken } });
    if (!currUser) return res.status(404).json({ error: "User not found" });
    const userId = currUser.id;
    const rows = await IssueReport.findAll({
      where: { user_id: userId, title: { [Op.iLike]: `%${q}%` } },
      attributes: ["title"],
      order: [["title", "ASC"]],
      limit: 25,
    });
    const titles = Array.from(new Set(rows.map(r => r.title))).slice(0, 10);
    res.json({ titles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/** Create a new issue report (basic fields only) */
exports.create = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;
    const created = await IssueReport.create({ title, description, isActive });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

/** Update an existing issue report's basic fields */
exports.update = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;

    const { title, description, isActive } = req.body;
    await row.update({ title, description, isActive });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

/** Delete an issue report by token */
exports.remove = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    await row.destroy();
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Title suggestions for autocomplete
/**
 * Global title suggestions across all reports.
 * Query param: q (partial title), returns up to 10 unique matches.
 */
exports.titleSuggestions = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ titles: [] });
    const rows = await IssueReport.findAll({
      where: { title: { [Op.iLike]: `%${q}%` } },
      attributes: ["title"],
      order: [["title", "ASC"]],
      limit: 25,
    });
    // De-duplicate titles
    const titles = Array.from(new Set(rows.map((r) => r.title))).slice(0, 10);
    res.json({ titles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
