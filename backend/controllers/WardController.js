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

// Return wards with leader+staff included
exports.listDetailed = async (req, res) => {
  try {
    const { Ward, CommunityLeader, MunicipalStaff, User } = require('../models')

    const scopeExists = typeof Ward.scope === 'function' && Ward.options?.scopes?.withPeople
    const wards = scopeExists
      ? await Ward.scope('withPeople').findAll()
      : await Ward.findAll({
          include: [
            { model: CommunityLeader, as: 'leader', include: [{ model: User, attributes: ['id','first_name','last_name','email'] }] },
            { model: MunicipalStaff,  as: 'staff',  include: [{ model: User, attributes: ['id','first_name','last_name','email'] }] },
          ],
          order: [['name','ASC']],
        })

    const data = wards.map(w => {
      const leader = w.leader || null
      const leaderUser = leader?.User || null
      const leaderId = leaderUser?.id || leader?.user_id || null
      const leaderName = leaderUser ? `${leaderUser.first_name} ${leaderUser.last_name}`.trim() : null

      const staff = Array.isArray(w.staff) ? w.staff : []
      const staffIds = staff
        .map(s => s?.User?.id ?? s?.user_id)
        .filter(v => v != null)

      return {
        id: w.id,
        name: w.name,
        code: w.code,
        leaderId,
        leaderName,
        staffIds,
        staffCount: staffIds.length,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }
    })

    res.json({ success: true, message: 'Wards loaded', data })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// Create a ward (name, code)
exports.create = async (req, res) => {
  try {
    const { name, code } = req.body
    if (!name || !code) return res.status(400).json({ success: false, message: 'name and code are required' })
    const ward = await Ward.create({ name, code })
    res.status(201).json({ success: true, message: 'Ward created', data: ward })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// Update a ward (name, code)
exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const patch = {}
    if (req.body.name != null) patch.name = req.body.name
    if (req.body.code != null) patch.code = req.body.code

    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })
    await ward.update(patch)
    res.json({ success: true, message: 'Ward updated' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// Delete a ward
exports.remove = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })
    await ward.destroy()
    res.json({ success: true, message: 'Ward deleted' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// Assign/unassign leader to ward
exports.setLeader = async (req, res) => {
  try {
    const { id } = req.params
    const { leaderUserId } = req.body
    const { CommunityLeader, User } = require('../models')

    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // Remove any existing leader for this ward
    await CommunityLeader.destroy({ where: { ward_id: id } })

    if (leaderUserId) {
      const user = await User.findByPk(leaderUserId)
      if (!user) return res.status(400).json({ success: false, message: 'Leader user not found' })
      await CommunityLeader.create({ ward_id: id, user_id: leaderUserId })
    }

    res.json({ success: true, message: 'Leader updated' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// Set staff list for a ward. Ensures one-ward-per-staff.
exports.setStaff = async (req, res) => {
  try {
    const { id } = req.params
    const { staffUserIds } = req.body
    const { MunicipalStaff } = require('../models')

    if (!Array.isArray(staffUserIds)) return res.status(400).json({ success: false, message: 'staffUserIds must be an array' })

    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // Unassign users from ward
    await MunicipalStaff.destroy({ where: { user_id: staffUserIds } })
  
    await MunicipalStaff.destroy({ where: { ward_id: id, user_id: { [require('sequelize').Op.notIn]: staffUserIds } } })
    // Assign
    const toCreate = staffUserIds.map(uid => ({ ward_id: id, user_id: uid }))
    if (toCreate.length) await MunicipalStaff.bulkCreate(toCreate, { ignoreDuplicates: true })

    res.json({ success: true, message: 'Staff updated' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}
