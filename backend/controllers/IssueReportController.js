const {
  IssueReport,
  User,
  Location,
  FileAttachment,
  Ward,
} = require("../models");
// Import Sequelize's operators (e.g., Op.iLike, Op.between) for more complex queries.
const { Op } = require("sequelize");
// Import the Zod schema for validation.
const issueReportSchema = require("../schemas/issueReportSchema");
// Import Zod's error class to specifically catch validation errors.
const { ZodError } = require("zod");
const { renderIssueLeaderEmail } = require("../services/emailRenderer"); // adjust path if needed
const { sendEmailAsync } = require("../services/emailService");

/**
 * A helper function to find a record by its token.
 * If not found, it automatically sends a 404 response, reducing code duplication.
 * @param {string} token - The unique token of the IssueReport to find.
 * @param {object} res - The Express response object.
 * @returns {Promise<IssueReport|null>} The found model instance or null if not found.
 */
async function findByTokenOr404(token, res) {
  const row = await IssueReport.findOne({ where: { token } });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return row;
}

/**
 * List issue reports with powerful, optional filtering capabilities.
 * Supports filtering by category, status, title, and a geographic bounding box.
 */
exports.list = async (req, res) => {
  // Destructure filter parameters from the request's query string (e.g., /issues?status=OPEN).
  const { sw_lat, sw_lng, ne_lat, ne_lng, category, status, title, q } =
    req.query;

  try {
    // --- Base Query Configuration ---
    // Start with a base options object for the Sequelize query.
    const options = {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["token", "first_name", "last_name", "email"], // Only include necessary, non-sensitive user fields.
        },
        {
          model: Location,
          as: "location",
          required: false, // Use a LEFT JOIN to include reports that may not have a location.
        },
        {
          model: FileAttachment,
          as: "attachments",
          attributes: ["token", "file_link", "description"], // Select specific attachment fields.
          required: false, // LEFT JOIN to include reports even if they have no attachments.
        },
      ],
      order: [["id", "DESC"]], // Default order: newest reports first.
    };

    // --- Dynamic Filter Construction ---
    // Build the `where` clause based on provided query parameters.
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    const titleTerm = q || title; // Allow either 'q' or 'title' for searching.
    if (titleTerm) where.title = { [Op.iLike]: `%${titleTerm}%` }; // `iLike` is a case-insensitive search.

    // Add the constructed where clause to the main options if any filters were applied.
    if (Object.keys(where).length) options.where = where;

    // --- Geospatial Filter ---
    // If all four bounding box coordinates are provided, add a location filter.
    if (sw_lat && sw_lng && ne_lat && ne_lng) {
      // Add a `where` clause specifically to the included Location model.
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
      // Change the join to an INNER JOIN. This ensures only reports *with* a location inside the box are returned.
      options.include[1].required = true;
    }

    // Execute the final query with all constructed options.
    const reports = await IssueReport.findAll(options);

    // --- Post-Query Processing ---
    // Convert Sequelize model instances to plain JavaScript objects for manipulation.
    const plainReports = reports.map((report) => report.get({ plain: true }));
    // Determine the base URL for constructing full file links.
    const baseUrl = process.env.BACKEND_URL || `http://${req.get("host")}`;

    // The database stores relative paths (`/uploads/file.png`). We must prepend the server's
    // base URL to make them accessible to the client.
    plainReports.forEach((report) => {
      if (report.attachments) {
        report.attachments.forEach((attachment) => {
          attachment.file_link = `${baseUrl}${attachment.file_link}`;
        });
      }
    });

    // Return normalized plain objects
    res.json(plainReports);
  } catch (e) {
    console.error("Failed to list issue reports:", e);
    res.status(500).json({ error: e.message });
  }
};

/** Fetch a single issue report by its token. */
exports.getOne = async (req, res) => {
  try {
    // Use the helper to find the record or send a 404 response.
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return; // Stop execution if the helper already sent a response.
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Get all reports created by a specific user, identified by their token.
 */
exports.getUserReports = async (req, res) => {
  try {
    const userToken = req.params.userToken;
    const { category, status, title, q } = req.query;

    // First, find the user's internal ID from their public token.
    const currUser = await User.findOne({ where: { token: userToken } });
    if (!currUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = currUser.id;

    // Build filters like the global list, but scoped to this user
    const where = { user_id: userId };
    if (category) where.category = category;
    if (status) where.status = status;
    const titleTerm = q || title;
    if (titleTerm) where.title = { [Op.iLike]: `%${titleTerm}%` };

    const reports = await IssueReport.findAll({
      where,
      include: [
        {
          model: FileAttachment,
          as: "attachments",
          attributes: ["token", "file_link", "description"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Normalize attachment URLs
    const plainReports = reports.map((report) => report.get({ plain: true }));
    const baseUrl = process.env.BACKEND_URL || `http://${req.get("host")}`;
    plainReports.forEach((report) => {
      if (report.attachments) {
        report.attachments.forEach((attachment) => {
          attachment.file_link = `${baseUrl}${attachment.file_link}`;
        });
      }
    });

    res.json(plainReports);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Provide title suggestions for an autocomplete feature, scoped to a specific user's reports.
 * Responds to a query parameter 'q' (e.g., /suggestions/user/abc?q=road).
 */
exports.titleSuggestionsForUser = async (req, res) => {
  try {
    const userToken = req.params.userToken;
    const q = String(req.query.q || "").trim(); // Get and sanitize the search term.
    if (!q) return res.json({ titles: [] });

    const currUser = await User.findOne({ where: { token: userToken } });
    if (!currUser) return res.status(404).json({ error: "User not found" });
    const userId = currUser.id;

    const rows = await IssueReport.findAll({
      where: { user_id: userId, title: { [Op.iLike]: `%${q}%` } }, // Filter by user AND title.
      attributes: ["title"], // Only fetch the title field for efficiency.
      order: [["title", "ASC"]],
      limit: 25,
    });
    // De-duplicate the results and limit to the top 10.
    const titles = Array.from(new Set(rows.map((r) => r.title))).slice(0, 10);
    res.json({ titles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/** Create a new issue report using data validated by a Zod schema. */
exports.create = async (req, res) => {
  try {
    // `parse` will throw a `ZodError` if the request body doesn't match the schema.

    const validatedData = issueReportSchema.parse(req.body);

    const {
      user_id,
      title,
      description,
      isActive,
      category,
      location_id,
      ward_code,
    } = validatedData;

    const ward = await Ward.findOne({
      where: { code: ward_code },
      attributes: ["id"],
    });

    if (!ward) {
      return res.status(400).json({
        errors: { ward_code: ["Selected ward does not exist."] },
      });
    }
    const created = await IssueReport.create({
      title,
      description,
      isActive,
      category,
      location_id,
      user_id,
      ward_id: ward.id,
    });

    const ward1 = await Ward.scope("withPeople").findByPk(ward.id);
    const leaderEmail =
      ward1?.leader?.User?.email ?? ward1?.leader?.user?.email ?? null;

    const [reporter, location] = await Promise.all([
      User.findByPk(created.user_id, {
        attributes: ["first_name", "last_name", "email"],
      }),
      Location.findByPk(created.location_id, {
        attributes: ["address", "latitude", "longitude"],
      }),
    ]);

    // Format date for the email’s header
    const fmt = new Intl.DateTimeFormat("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Johannesburg",
    });

    const emailData = {
      title: created.title,
      category: created.category,
      status: created.status ?? "NEW",
      reporterName: reporter
        ? `${reporter.first_name} ${reporter.last_name}`.trim()
        : "Unknown",
      reporterEmail: reporter?.email ?? "unknown",
      wardCode: ward_code,
      description: created.description,
      address: location?.address ?? "—",
      latitude: location?.latitude ?? "—",
      longitude: location?.longitude ?? "—",
      mapsLink:
        location?.latitude && location?.longitude
          ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
          : "",
      createdAt: fmt.format(created.createdAt ?? new Date()),
    };

    // Render the HTML from your template
    const html = await renderIssueLeaderEmail(emailData);

    await sendEmailAsync({
      to: leaderEmail,
      subject: `New issue in Ward ${emailData.wardCode}: ${emailData.title}`,
      html,
    });

    res.status(201).json(created);
  } catch (e) {
    // If the error is from Zod, format it into a user-friendly response.
    if (e instanceof ZodError) {
      return res.status(400).json({ errors: e.flatten().fieldErrors });
    }
    // Handle other potential errors (e.g., database constraint violations).
    res.status(400).json({ error: e.message });
    console.log(e.message);
  }
};

/** Update an existing issue report's basic fields. */
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

/** Delete an issue report by its token. */
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

/**
 * Provide global title suggestions for an autocomplete feature across all reports.
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
    const titles = Array.from(new Set(rows.map((r) => r.title))).slice(0, 10);
    res.json({ titles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
