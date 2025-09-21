const { Location, IssueReport } = require('../models');

/**
 * CREATE a new location
 */
exports.create = async (req, res) => {
  const { address, latitude, longitude } = req.body;

  console.log("Creating location with data:", req.body);

  // Basic validation
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required fields.' });
  }

  try {
    const newLocation = await Location.create({
      address,
      latitude,
      longitude,
    });
    res.status(201).json(newLocation);
  } catch (e) {
    console.error("Failed to create location:", e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * LIST all locations
 */
exports.list = async (req, res) => {
  try {
    const locations = await Location.findAll({
      order: [['id', 'DESC']], // Show newest first
    });
    res.json(locations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET one location by its token
 */
exports.getOne = async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { token: req.params.token },
      // Optionally include associated issue reports
      include: [{
        model: IssueReport,
        as: 'issueReports',
        attributes: ['token', 'title', 'status']
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
 * UPDATE an existing location by its token
 */
exports.update = async (req, res) => {
  try {
    const location = await Location.findOne({ where: { token: req.params.token } });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const { address, latitude, longitude } = req.body;

    // Update fields only if they are provided in the request body
    if (address !== undefined) location.address = address;
    if (latitude !== undefined) location.latitude = latitude;
    if (longitude !== undefined) location.longitude = longitude;

    await location.save();
    res.json(location);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * DELETE a location by its token
 */
exports.remove = async (req, res) => {
  try {
    const location = await Location.findOne({ where: { token: req.params.token } });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await location.destroy();
    res.status(204).send(); // Standard "No Content" response for successful deletion
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};