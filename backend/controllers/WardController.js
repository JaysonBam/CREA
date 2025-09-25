const { Op } = require('sequelize')
const {
  sequelize,
  Ward,
  CommunityLeader,
  MunicipalStaff,
  User,
  IssueReport, 
} = require('../models')

const DEFAULT_JOB_DESCRIPTION = 'General'

//  Helpers 
function safeName(v) {
  return (v ?? '').toString().trim()
}

function parseStaffIds(body) {
  // Accepts: staffUserIds, memberIds, staffIds, staff_ids, users (array of ids or array of {id})
  const raw =
    body?.staffUserIds ??
    body?.memberIds ??
    body?.staffIds ??
    body?.staff_ids ??
    body?.users ??
    null;
  if (!Array.isArray(raw)) return null;
  const ids = raw
    .map(v => {
      if (v == null) return null;
      if (typeof v === 'object') return (v.id ?? v.user_id ?? v.userId ?? v.value ?? null);
      const s = String(v).trim();
      return s === '' ? null : (Number.isNaN(Number(v)) ? s : (String(Number(v)) === s ? Number(v) : s));
    })
    .filter(v => v !== null);
  return ids.length ? Array.from(new Set(ids)) : [];
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
  const leaderUser = w?.leader?.User || w?.leader?.user || null
  const leaderId = leaderUser?.id ?? w?.leader?.user_id ?? null
  const leaderName = leaderUser ? `${leaderUser.first_name || ''} ${leaderUser.last_name || ''}`.trim() : null

  const staff = Array.isArray(w?.staff) ? w.staff : []
  const staffIds = staff.map(s => (s?.User?.id ?? s?.user?.id ?? s?.user_id)).filter(v => v != null)

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

function mapWardLeader(w) {
  const leaderUser = w?.leader?.User || w?.leader?.user || null
  const leaderId = leaderUser?.id ?? w?.leader?.user_id ?? null
  const leaderName = leaderUser ? `${leaderUser.first_name || ''} ${leaderUser.last_name || ''}`.trim() : null
  return {
    id: w.id,
    name: w.name,
    code: w.code,
    leaderId,
    leaderName,
  }
}

function mapWardSummary(w) {
  const leaderUser = w?.leader?.User || w?.leader?.user || null
  const leaderName = leaderUser ? `${leaderUser.first_name || ''} ${leaderUser.last_name || ''}`.trim() : null
  const staffArr = Array.isArray(w?.staff) ? w.staff : []
  const staffCount = staffArr.length
  return {
    id: w.id,
    name: w.name,
    leaderName,
    staffCount,
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

//  List with leader names only (for tables needing a quick view)
exports.listWithLeaders = async (req, res) => {
  try {
    const wards = await Ward.findAll({
      attributes: ['id', 'name', 'code'],
      include: [
        { model: CommunityLeader, as: 'leader', include: [{ model: User, attributes: ['id', 'first_name', 'last_name'] }] },
      ],
      order: [['name', 'ASC']],
    })
    const data = wards.map(mapWardLeader)
    res.json({ success: true, message: 'Wards + leader names loaded', data })
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
    // accept camelCase, snake_case, and legacy key
    const rawLeader = req.body?.leaderId ?? req.body?.leader_id ?? req.body?.leaderUserId ?? null
    const leaderUserId = rawLeader === null || rawLeader === undefined || rawLeader === '' ? null : Number(rawLeader)
    if (rawLeader !== null && rawLeader !== undefined && rawLeader !== '' && Number.isNaN(leaderUserId)) {
      return res.status(400).json({ success: false, message: 'leaderId must be a number' })
    }
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    // Remove any existing leader for this ward and also any existing leader record for this user across wards
    await CommunityLeader.destroy({
      where: {
        [Op.or]: [
          { ward_id: id },
          leaderUserId != null ? { user_id: leaderUserId } : null,
        ].filter(Boolean),
      },
    })

    if (leaderUserId != null) {
      const user = await User.findByPk(leaderUserId)
      if (!user) return res.status(400).json({ success: false, message: 'Leader user not found' })
      await CommunityLeader.create({ ward_id: id, user_id: leaderUserId })
    }

    return res.json({ success: true, message: 'Leader updated', data: { wardId: Number(id), leaderId: leaderUserId } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// Alias to match route naming
exports.assignLeader = async (req, res) => exports.setLeader(req, res)

//  Set staff list 
exports.setStaff = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const ward = await Ward.findByPk(id, { transaction: t });
    if (!ward) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    // Accept staffUserIds or similar shapes
    let staffUserIds = parseStaffIds(req.body);
    if (staffUserIds === null) {
      
      staffUserIds = parseStaffIds({ users: req.body?.staff });
    }
    if (!Array.isArray(staffUserIds)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Provide staffUserIds as an array (ids or {id})' });
    }

    // Validate users exist 
    const existingUsers = await User.findAll({
      where: { id: { [Op.in]: staffUserIds } },
      attributes: ['id'],
      transaction: t,
    });
    const validIds = existingUsers.map(u => u.id);

    // One-ward-per-staff: remove links for these users everywhere
    if (validIds.length) {
      await MunicipalStaff.destroy({
        where: { user_id: { [Op.in]: validIds } },
        transaction: t,
      });
    }

    // Remove any staff currently linked to this ward that are NOT desired
    await MunicipalStaff.destroy({
      where: {
        ward_id: id,
        ...(validIds.length ? { user_id: { [Op.notIn]: validIds } } : {}),
      },
      transaction: t,
    });

    // Create desired links 
    for (const uid of validIds) {
      
      await MunicipalStaff.findOrCreate({
        where: { ward_id: id, user_id: uid },
        defaults: { ward_id: id, user_id: uid, job_description: req.body?.job_description || DEFAULT_JOB_DESCRIPTION },
        transaction: t,
      });
    }

    await t.commit();
    return res.json({ success: true, message: 'Staff updated', data: { wardId: Number(id), staffUserIds: validIds } });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ success: false, message: e.message });
  }
}

//  List staff for a ward 
exports.listStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const ward = await Ward.findByPk(id, {
      include: [
        { model: MunicipalStaff, as: 'staff', include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email'] }] },
      ],
    });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const staff = Array.isArray(ward.staff) ? ward.staff : [];
    const staffUserIds = staff.map(s => s?.User?.id ?? s?.user_id).filter(v => v != null);
    const staffUsers = staff
      .map(s => s?.User)
      .filter(Boolean)
      .map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email ?? null }));

    return res.json({
      success: true,
      message: 'Ward staff loaded',
      data: { wardId: Number(id), staffUserIds, staff: staffUsers },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

//  Bulk clear staff
exports.clearStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const ward = await Ward.findByPk(id);
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const removed = await MunicipalStaff.destroy({ where: { ward_id: id } });
    return res.json({ success: true, message: 'All staff cleared from ward', data: { wardId: Number(id), removed, staffUserIds: [] } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

//  Add one staff 
exports.addStaff = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const rawUserId = req.params.userId ?? req.body?.userId ?? req.body?.user_id;
    if (rawUserId === undefined || rawUserId === null || String(rawUserId).trim() === '') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const userId = typeof rawUserId === 'string' ? rawUserId.trim() : rawUserId;

    const ward = await Ward.findByPk(id, { transaction: t });
    if (!ward) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Enforce one-ward-per-staff
    await MunicipalStaff.destroy({ where: { user_id: userId }, transaction: t });
    await MunicipalStaff.findOrCreate({
      where: { ward_id: id, user_id: userId },
      defaults: { ward_id: id, user_id: userId, job_description: req.body?.job_description || DEFAULT_JOB_DESCRIPTION },
      transaction: t,
    });

    await t.commit();
    return res.json({ success: true, message: 'Staff added to ward', data: { wardId: Number(id), userId } });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ success: false, message: e.message });
  }
}

//  Remove one staff
exports.removeStaff = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const rawUserId = req.params.userId ?? req.body?.userId ?? req.body?.user_id;
    if (rawUserId === undefined || rawUserId === null || String(rawUserId).trim() === '') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const userId = typeof rawUserId === 'string' ? rawUserId.trim() : rawUserId;

    const ward = await Ward.findByPk(id, { transaction: t });
    if (!ward) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    const removed = await MunicipalStaff.destroy({ where: { ward_id: id, user_id: userId }, transaction: t });
    await t.commit();
    return res.json({
      success: true,
      message: removed ? 'Staff removed from ward' : 'No link existed',
      data: { wardId: Number(id), userId },
    });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ success: false, message: e.message });
  }
}

//  Show 
exports.show = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id, {
      attributes: ['id', 'name', 'code'],
      include: [
        { model: CommunityLeader, as: 'leader', include: [{ model: User, attributes: ['id', 'first_name', 'last_name'] }] },
        { model: MunicipalStaff, as: 'staff', attributes: ['user_id'] },
      ],
    })
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    const data = mapWardSummary(ward)
    return res.json({ success: true, message: 'Ward loaded', data })
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message })
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
      return res.json({ success: true, message: 'Stats (placeholder)', data: { open: 0, closed: 0, pending: 0, avgResolution: null } })
    }

    const issues = await IssueReport.findAll({
      where: { ward_id: id },
      attributes: ['id', 'status', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    })

    let total = 0
    let closed = 0
    let pending = 0
    let totalResolutionSec = 0
    let resolvedCount = 0

    for (const r of issues) {
      total += 1
      const status = String(r.status || '').toUpperCase()
      if (status === 'PENDING') pending += 1
      if (status === 'CLOSED' || status === 'RESOLVED') {
        closed += 1
        const start = r.createdAt ? new Date(r.createdAt).getTime() : null
        const end = r.updatedAt ? new Date(r.updatedAt).getTime() : null
        if (start && end && end > start) {
          totalResolutionSec += (end - start) / 1000
          resolvedCount += 1
        }
      }
    }

    const open = Math.max(0, total - closed - pending)
    const avgResolution = resolvedCount > 0 ? totalResolutionSec / resolvedCount : null

    return res.json({ success: true, message: 'Ward stats loaded', data: { open, closed, pending, avgResolution } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}
