const { Location, IssueReport } = require('../models');

/**
 * CREATE a new location record.
 */
exports.create = async (req, res) => {
  // Destructure location data from the request body.
  const { address, latitude, longitude } = req.body;

  // Perform basic server-side validation to ensure essential fields are present.
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required fields.' });
  }

  try {
    // Create a new entry in the Location table with the provided data.
    const newLocation = await Location.create({
      address,
      latitude,
      longitude,
    });
    // Respond with a 201 "Created" status and the new location object.
    res.status(201).json(newLocation);
  } catch (e) {
    console.error("Failed to create location:", e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * LIST all locations stored in the database.
 */
exports.list = async (req, res) => {
  try {
    // Fetch all records from the Location table.
    const locations = await Location.findAll({
      order: [['id', 'DESC']], // Order by ID to show the most recently created locations first.
    });
    res.json(locations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET a single location by its unique token, including its associated issue reports.
 */
exports.getOne = async (req, res) => {
  try {
    // Find the location matching the token from the URL parameters.
    const location = await Location.findOne({
      where: { token: req.params.token },
      // Eager load any IssueReports that are linked to this location.
      include: [{
        model: IssueReport,
        as: 'issueReports', // The alias defined in the model association.
        attributes: ['token', 'title', 'status'] // Only include a summary of each report.
      }]
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * UPDATE an existing location by its token.
 */
exports.update = async (req, res) => {
  try {
    // First, find the location that needs to be updated.
    const location = await Location.findOne({ where: { token: req.params.token } });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const { address, latitude, longitude } = req.body;

    // Update fields only if they are explicitly provided in the request.
    // This prevents accidentally nullifying existing data.
    if (address !== undefined) location.address = address;
    if (latitude !== undefined) location.latitude = latitude;
    if (longitude !== undefined) location.longitude = longitude;

    // Persist the changes to the database.
    await location.save();
    res.json(location);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * DELETE a location by its token.
 */
exports.remove = async (req, res) => {
  try {
    const location = await Location.findOne({ where: { token: req.params.token } });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Delete the database record.
    // Note: This may fail if there are foreign key constraints (e.g., if IssueReports
    // are not set to cascade on delete or set their location_id to null).
    await location.destroy();
    res.status(204).send(); // Respond with 204 "No Content" on successful deletion.
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};