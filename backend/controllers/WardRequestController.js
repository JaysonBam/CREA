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
};
