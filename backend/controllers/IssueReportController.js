const { IssueReport, User, Location, FileAttachment } = require("../models");
const { Op } = require("sequelize"); // Import Sequelize's operators
const issueReportSchema = require('../validators/issueReportSchema');
const { ZodError } = require('zod'); // Import ZodError for catching validation errors

async function findByTokenOr404(token, res) {
  const row = await IssueReport.findOne({ where: { token } });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return row;
}

exports.list = async (_req, res) => {
  // Destructure the bounding box coordinates from the request query
  const { sw_lat, sw_lng, ne_lat, ne_lng } = _req.query;

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
        {
            model: FileAttachment,
            as: 'attachments', // This alias MUST match what the frontend expects
            attributes: ['token', 'file_link', 'description'], // Only send necessary data
            required: false    // Use a LEFT JOIN to include reports even if they have no attachments
        },
      ],
      order: [["id", "DESC"]], // Order by most recent
    };

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
    const reports = await IssueReport.findAll(options);
    
    const plainReports = reports.map(report => report.get({ plain: true }));
    const baseUrl = process.env.BACKEND_URL || `http://${req.get('host')}`;

    // Loop through the reports and attachments to create full URLs
    plainReports.forEach(report => {
        if (report.attachments) {
            report.attachments.forEach(attachment => {
                attachment.file_link = `${baseUrl}${attachment.file_link}`;
            });
        }
    });

    res.json(reports);
  } catch (e) {
    console.error("Failed to list issue reports:", e);
    res.status(500).json({ error: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getUserReports = async (req, res) => {
  console.log("Fetching reports for user:", req.params.userToken);
    try {
        const userToken = req.params.userToken;
        // find user id for given token
        const currUser = await User.findOne({ where: { token: userToken } });
        if (!currUser) {
            return res.status(404).json({ error: "User not found" });
        }
        const userId = currUser.id;
        console.log("Found user ID:", userId);

        // find all issue reports for given user id
        const reports = await IssueReport.findAll({
            where: { user_id: userId },
            // Include the associated FileAttachment model
            include: [
                {
                    model: FileAttachment,
                    as: 'attachments', // This alias MUST match what the frontend expects
                    attributes: ['token', 'file_link', 'description'], // Only send necessary data
                    required: false    // Use a LEFT JOIN to include reports even if they have no attachments
                }
            ],
            order: [["createdAt", "DESC"]] // Order by newest first is generally better for user reports
        });

        const plainReports = reports.map(report => report.get({ plain: true }));
        const baseUrl = process.env.BACKEND_URL || `http://${req.get('host')}`;

        // Loop through the reports and attachments to create full URLs
        plainReports.forEach(report => {
            if (report.attachments) {
                report.attachments.forEach(attachment => {
                    attachment.file_link = `${baseUrl}${attachment.file_link}`;
                });
            }
        });


        res.json(reports);
        console.log(`Found ${reports.length} reports for user ${userToken}`);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.create = async (req, res) => {
  try {
    console.log("Creating issue report with data:", req.body);
    const validatedData = issueReportSchema.parse(req.body);
    const { user_id, title, description, isActive, category, location_id } = validatedData;
    const created = await IssueReport.create({ title, description, isActive, category, location_id, user_id });
    res.status(201).json(created);
  } catch (e) {
    console.error("Error creating issue report:", e);
    if (e instanceof ZodError) {
      // Respond with a structured list of errors
      return res.status(400).json({ errors: e.treeifyError().fieldErrors });
    }
    res.status(400).json({ error: e.message });
  }
};

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
