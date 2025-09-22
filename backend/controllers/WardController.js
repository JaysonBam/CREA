const { Op } = require('sequelize')
const {
  Ward,
  CommunityLeader,
  MunicipalStaff,
  User,
  IssueReport, 
} = require('../models')

//  Helpers 
function safeName(v) {
  return (v ?? '').toString().trim()
}

function makeBaseCode(n) {
  const s = (n ?? '')
    .toString()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .toUpperCase()
  return s.slice(0, 24) || 'WARD'
}

async function uniqueCode(desired) {
  let base = (desired ?? '').toString().trim().toUpperCase() || 'WARD'
  let finalCode = base
  let suffix = 1

  while (await Ward.count({ where: { code: finalCode } })) {
    suffix += 1
    finalCode = `${base}-${suffix}`
    if (finalCode.length > 32) {
      finalCode = `${base.slice(0, Math.max(4, 32 - (`-${suffix}`).length))}-${suffix}`
    }
  }
  return finalCode
}

function mapWardWithPeople(w) {
  const leaderUser = w?.leader?.User || null
  const leaderId = leaderUser?.id ?? w?.leader?.user_id ?? null
  const leaderName = leaderUser ? `${leaderUser.first_name || ''} ${leaderUser.last_name || ''}`.trim() : null

  const staff = Array.isArray(w?.staff) ? w.staff : []
  const staffIds = staff.map(s => s?.User?.id ?? s?.user_id).filter(v => v != null)

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
}

//  List
exports.list = async (req, res) => {
  try {
    const wards = await Ward.findAll({
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']],
    })
    res.json({ success: true, message: 'Ward codes loaded', data: wards })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  List with leader/staff 
exports.listDetailed = async (req, res) => {
  try {
    const scopeExists = typeof Ward.scope === 'function' && Ward.options?.scopes?.withPeople
    const wards = scopeExists
      ? await Ward.scope('withPeople').findAll()
      : await Ward.findAll({
          include: [
            { model: CommunityLeader, as: 'leader', include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email'] }] },
            { model: MunicipalStaff, as: 'staff', include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email'] }] },
          ],
          order: [['name', 'ASC']],
        })

    const data = wards.map(mapWardWithPeople)
    res.json({ success: true, message: 'Wards loaded', data })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Create (name required, code optional & unique) 
exports.create = async (req, res) => {
  try {
    const name = safeName(req.body?.name)
    let code = req.body?.code ? safeName(req.body.code).toUpperCase() : null
    if (!name) return res.status(400).json({ success: false, message: 'Field "name" is required' })

    if (!code) code = makeBaseCode(name)
    code = await uniqueCode(code)

    const ward = await Ward.create({ name, code })
    return res.status(201).json({ success: true, message: 'Ward created', data: ward })
  } catch (e) {
    const msg = e?.errors?.[0]?.message || e?.original?.detail || e?.message || 'Internal error'
    return res.status(500).json({ success: false, message: msg })
  }
}

//  Update (name/code) 
exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    if (req.body?.name !== undefined) ward.name = safeName(req.body.name)
    if (req.body?.code !== undefined) ward.code = safeName(req.body.code).toUpperCase() || ward.code

    await ward.save()
    return res.json({ success: true, message: 'Ward updated', data: ward })
  } catch (e) {
    const msg = e?.errors?.[0]?.message || e?.original?.detail || e?.message || 'Internal error'
    return res.status(500).json({ success: false, message: msg })
  }
}

//  Delete 
exports.remove = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // Clean up relations
    await CommunityLeader.destroy({ where: { ward_id: id } })
    await MunicipalStaff.destroy({ where: { ward_id: id } })

    await ward.destroy()
    res.json({ success: true, message: 'Ward deleted', data: { id } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Set/Assign leader 
exports.setLeader = async (req, res) => {
  try {
    const { id } = req.params
    const leaderUserId = safeName(req.body?.leaderUserId)
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // Remove any existing leader for this ward and also any existing leader record for this user across wards
    await CommunityLeader.destroy({ where: { [Op.or]: [{ ward_id: id }, leaderUserId ? { user_id: leaderUserId } : null].filter(Boolean) } })

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

// Alias to match route naming
exports.assignLeader = async (req, res) => exports.setLeader(req, res)

//  Set staff list 
exports.setStaff = async (req, res) => {
  try {
    const { id } = req.params
    const staffUserIds = Array.isArray(req.body?.staffUserIds) ? req.body.staffUserIds.filter(Boolean) : null
    if (!staffUserIds) return res.status(400).json({ success: false, message: 'staffUserIds must be an array' })

    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // One-ward-per-staff: remove any existing staff links for these users (from any ward)
    await MunicipalStaff.destroy({ where: { user_id: { [Op.in]: staffUserIds } } })

    // Remove any staff on this ward that are NOT in the desired list
    await MunicipalStaff.destroy({ where: { ward_id: id, user_id: { [Op.notIn]: staffUserIds } } })

    // Create desired links
    const rows = staffUserIds.map(uid => ({ ward_id: id, user_id: uid }))
    if (rows.length) await MunicipalStaff.bulkCreate(rows, { ignoreDuplicates: true })

    res.json({ success: true, message: 'Staff updated' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Add one staff 
exports.addStaff = async (req, res) => {
  try {
    const { id, userId } = req.params
    if (!userId) return res.status(400).json({ success: false, message: 'userId param is required' })

    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // Enforce one-ward-per-staff
    await MunicipalStaff.destroy({ where: { user_id: userId } })
    await MunicipalStaff.create({ ward_id: id, user_id: userId })

    res.json({ success: true, message: 'Staff added to ward', data: { wardId: id, userId } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Remove one staff 
exports.removeStaff = async (req, res) => {
  try {
    const { id, userId } = req.params
    if (!userId) return res.status(400).json({ success: false, message: 'userId param is required' })

    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    const removed = await MunicipalStaff.destroy({ where: { ward_id: id, user_id: userId } })
    res.json({ success: true, message: removed ? 'Staff removed from ward' : 'No link existed', data: { wardId: id, userId } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Profile 
exports.profile = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id, {
      include: [
        { model: CommunityLeader, as: 'leader', include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email'] }] },
        { model: MunicipalStaff, as: 'staff', include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email'] }] },
      ],
    })
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    const leaderUser = ward.leader?.User || null
    const leader = leaderUser
      ? {
          id: leaderUser.id,
          name: `${leaderUser.first_name || ''} ${leaderUser.last_name || ''}`.trim(),
          email: leaderUser.email || null,
        }
      : null

    const staff = Array.isArray(ward.staff)
      ? ward.staff
          .map(s => s?.User)
          .filter(Boolean)
          .map(u => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            email: u.email || null,
          }))
      : []

    res.json({
      success: true,
      message: 'Ward profile loaded',
      data: {
        id: ward.id,
        name: ward.name,
        code: ward.code,
        leader,
        staff,
        staffCount: staff.length,
        createdAt: ward.createdAt,
        updatedAt: ward.updatedAt,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Stats 
exports.stats = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    if (!IssueReport) {
      return res.json({
        success: true,
        message: 'Stats (placeholder)',
        data: { open: 0, in_progress: 0, pending: 0, closed: 0, avgResolutionDays: null, total: 0 },
      })
    }

    const issues = await IssueReport.findAll({
      where: { ward_id: id },
      attributes: ['id', 'status', 'createdAt', 'resolved_at', 'closed_at'],
      order: [['createdAt', 'DESC']],
    })

    const counters = { open: 0, in_progress: 0, pending: 0, closed: 0, other: 0 }
    let totalResolutionMs = 0
    let resolvedCount = 0

    for (const r of issues) {
      const s = String(r.status || '').toLowerCase()
      if (s.includes('close') || s === 'resolved' || s === 'closed' || s === 'done') counters.closed++
      else if (s === 'open' || s === 'new') counters.open++
      else if (s.includes('progress')) counters.in_progress++
      else if (s === 'pending' || s === 'waiting') counters.pending++
      else counters.other++

      const endTs = r.resolved_at || r.closed_at || null
      if (endTs && r.createdAt) {
        const ms = new Date(endTs).getTime() - new Date(r.createdAt).getTime()
        if (Number.isFinite(ms) && ms > 0) {
          totalResolutionMs += ms
          resolvedCount += 1
        }
      }
    }

    const avgResolutionDays = resolvedCount > 0 ? +(totalResolutionMs / resolvedCount / (1000 * 60 * 60 * 24)).toFixed(2) : null

    res.json({
      success: true,
      message: 'Ward stats loaded',
      data: { ...counters, avgResolutionDays, total: issues.length },
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}
