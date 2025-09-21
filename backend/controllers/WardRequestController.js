const { WardRequest } = require("../models");

module.exports = {
  // POST /api/ward-requests
  async create(request, response) {
    try {
      const { message, type = "request" } = request.body;
      const userId = request.user.user_id;
      // For now, person_id and sender_id are the same
      const newRequest = await WardRequest.create({
        person_id: userId,
        sender_id: userId,
        message,
        type,
      });
      return response.status(201).json({ success: true, request: newRequest });
    } catch (e) {
      return response.status(500).json({ success: false, message: "Failed to create ward request" });
    }
  },
  // GET /api/ward-requests
  async list(request, response) {
    try {
      // Only allow if user is admin
      if (!request.user || request.user.role !== 'admin') {
        return response.status(403).json({ success: false, message: 'Forbidden' });
      }
      const { User } = require("../models");
      const requests = await WardRequest.findAll({
        order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'person', attributes: ['id', 'first_name', 'last_name'] }],
      });
      return response.status(200).json({ success: true, requests });
    } catch (e) {
      return response.status(500).json({ success: false, message: 'Failed to fetch ward requests' });
    }
  },
};
