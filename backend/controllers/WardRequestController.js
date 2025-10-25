const db = require("../models");
const { WardRequest } = db;
const { User, MunicipalStaff, CommunityLeader, Ward } = db;
const { wardRequestSchema } = require("../schemas/wardRequestSchema");

function zodIssuesToBag(issues = []) {
  const bag = {};
  for (const i of issues) {
    const field = String(i.path?.[0] ?? "");
    const key = field || "_";
    if (!bag[key]) bag[key] = i.message;
  }
  return bag;
}

module.exports = {
  async create(request, response) {
    try {
      // Validate request body using Zod schema
      const parsed = wardRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.status(422).json({
          success: false,
          message: "Validation failed",
          errors: zodIssuesToBag(parsed.error.issues),
        });
      }

      // Extract validated fields
      const { message, type = "request", person_id, ward_id, job_description } = parsed.data;
      // The user making the request (from JWT)
      const userId = request.user.user_id;
      let actualPersonId = person_id;
      let actualSenderId = userId;
      // If no person_id provided, default to sender (self-request)
      if (!actualPersonId) actualPersonId = userId;

      // Authorization (simple): only allow leaving on behalf of another user if caller is admin
      if (type === 'leave' && actualSenderId !== actualPersonId && request.user.role !== 'admin') {
        return response.status(403).json({ success: false, message: 'Forbidden' });
      }

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
      } else if (type === 'leave') {
        // Handle leaving a ward: remove the assignment record for staff or community leader
        user = await User.findByPk(actualPersonId);
        if (!user) {
          return response.status(404).json({ success: false, message: 'User not found' });
        }

        // Wrap deletion and audit (ward request creation) in a transaction
        const t = await db.sequelize.transaction();
        try {
          if (user.role === 'staff') {
            await MunicipalStaff.destroy({ where: { user_id: user.id, ward_id }, transaction: t });
          } else if (user.role === 'communityleader') {
            await CommunityLeader.destroy({ where: { user_id: user.id, ward_id }, transaction: t });
          } else {
            // User role not applicable for leave
            await t.rollback();
            return response.status(400).json({ success: false, message: 'User role cannot leave a ward' });
          }

          // create audit record inside the same transaction
          const newRequest = await WardRequest.create({
            person_id: actualPersonId,
            sender_id: actualSenderId,
            ward_id,
            job_description: jobDescToUse,
            message,
            type,
          }, { transaction: t });

          await t.commit();
          return response.status(201).json({ success: true, request: newRequest });
        } catch (err) {
          await t.rollback();
          return response.status(500).json({ success: false, message: 'Failed to remove user from ward' });
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
      // Community leaders with assigned ward can view requests for their ward
      const { User, Ward } = require("../models");
      let allRequests = [];
      if (request.user.role === 'admin') {
        allRequests = await WardRequest.findAll({
          order: [['created_at', 'DESC']],
          include: [
            { model: User, as: 'person', attributes: ['id', 'first_name', 'last_name'] },
            { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] }
          ],
        });
      } else if (request.user.role === 'communityleader') {
        // Find leader's assigned ward via CommunityLeader table
        const leaderRole = await CommunityLeader.findOne({ where: { user_id: request.user.user_id } });
        if (!leaderRole || !leaderRole.ward_id) {
          return response.status(403).json({ success: false, message: 'Forbidden' });
        }
        allRequests = await WardRequest.findAll({
          where: { ward_id: leaderRole.ward_id },
          order: [['created_at', 'DESC']],
          include: [
            { model: User, as: 'person', attributes: ['id', 'first_name', 'last_name'] },
            { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] }
          ],
        });
      } else {
        return response.status(403).json({ success: false, message: 'Forbidden' });
      }
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
