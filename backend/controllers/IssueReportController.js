const { IssueReport, User, Location } = require("../models");
const { Op } = require("sequelize"); // Import Sequelize's operators

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
    const rows = await IssueReport.findAll(options);

    res.json(rows);
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
    try {
        const userToken = req.params.userToken;
        // find user id for given token
        const currUser = await User.findOne({ where: { token: userToken } });
        if (!currUser) {
            return res.status(404).json({ error: "User not found" });
        }
        const userId = currUser.id;

        // find all issue reports for given user id
        const reports = await IssueReport.findAll({ where: { user_id: userId }, order: [["id", "ASC"]] });
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.create = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;
    const created = await IssueReport.create({ title, description, isActive });
    res.status(201).json(created);
  } catch (e) {
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
