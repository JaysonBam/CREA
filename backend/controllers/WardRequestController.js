const { WardRequest } = require("../models");
const { User, MunicipalStaff, CommunityLeader, Ward } = require("../models");

module.exports = {
  async create(request, response) {
    try {
      // Extract relevant fields from the request body
      const { message, type = "request", person_id, ward_id, job_description } = request.body;
      if (!ward_id) {
        // Must specify a ward to join or assign
        return response.status(400).json({ success: false, message: "ward_id is required" });
      }
      // The user making the request (from JWT)
      const userId = request.user.user_id;
      let actualPersonId = person_id;
      let actualSenderId = userId;
      // If no person_id provided, default to sender (self-request)
      if (!actualPersonId) actualPersonId = userId;

      // If this is an acceptance, assign the user to the ward
      let jobDescToUse = job_description;
      let user = null;
      if (type === 'accept') {
        user = await User.findByPk(actualPersonId);
        if (!user) {
          // Can't assign if user doesn't exist
          return response.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role === 'staff') {
          // Assign staff to ward with job description
          jobDescToUse = jobDescToUse || 'staff description';
          await MunicipalStaff.create({
            user_id: user.id,
            ward_id,
            job_description: jobDescToUse,
          });
        } else if (user.role === 'communityleader') {
          // Assign community leader to ward
          jobDescToUse = 'community leader';
          await CommunityLeader.create({
            user_id: user.id,
            ward_id,
          });
        }
      } else {
        // For new requests, set job_description based on role if not provided
        user = await User.findByPk(actualPersonId);
        if (user && user.role === 'communityleader') {
          jobDescToUse = 'community leader';
        } else if (user && user.role === 'staff') {
          jobDescToUse = jobDescToUse || 'staff description';
        }
      }

      // Create the ward request record
      const newRequest = await WardRequest.create({
        person_id: actualPersonId,
        sender_id: actualSenderId,
        ward_id,
        job_description: jobDescToUse,
        message,
        type,
      });
      return response.status(201).json({ success: true, request: newRequest });
    } catch (e) {
      // Catch-all for unexpected errors
      return response.status(500).json({ success: false, message: "Failed to create ward request" });
    }
  },

  async list(request, response) {
    try {
      // Only admins can view all ward requests
      if (!request.user || request.user.role !== 'admin') {
        return response.status(403).json({ success: false, message: 'Forbidden' });
      }
      const { User, Ward } = require("../models");
      // Get all requests, newest first
      const allRequests = await WardRequest.findAll({
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'person', attributes: ['id', 'first_name', 'last_name'] },
          { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] }
        ],
      });
      // Only keep the latest request per person (if it's a join request)
      const latestByPerson = {};
      for (const req of allRequests) {
        if (!latestByPerson[req.person_id]) {
          latestByPerson[req.person_id] = req;
        }
      }
      const pendingRequests = Object.values(latestByPerson).filter(r => r.type === 'request');
      return response.status(200).json({ success: true, requests: pendingRequests });
    } catch (e) {
      return response.status(500).json({ success: false, message: 'Failed to fetch ward requests' });
    }
  },

  async chain(request, response) {
    try {
      const { userId } = request.params;
      const { User, Ward } = require("../models");
      // Get all requests for this user, oldest first
      const allRequests = await WardRequest.findAll({
        where: { person_id: userId },
        order: [['created_at', 'ASC']],
        include: [
          { model: User, as: 'person', attributes: ['id', 'first_name', 'last_name'] },
          { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] }
        ],
      });
      return response.status(200).json({ success: true, requests: allRequests });
    } catch (e) {
      return response.status(500).json({ success: false, message: 'Failed to fetch ward request chain' });
    }
  },
};
