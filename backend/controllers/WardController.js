const { Ward } = require("../models");

exports.list = async (req, res) => {
  try {
    const wards = await Ward.findAll({
      attributes: ["id", "name", "code"],
      order: [["name", "ASC"]],
    });
    res.json({ success: true, message: "Ward codes loaded", data: wards });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
