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

/**
 * Compute average seconds to resolve issues in a ward using only issue_reports table.
 * Only considers issues in state RESOLVED and where updatedAt > createdAt.
 * Returns: number (seconds) | null
 */
async function computeAvgResolutionSeconds(wardId) {
  // Simplified: Only consider issues currently RESOLVED for this ward
  // and where updatedAt > createdAt. Return average seconds, or null if none.
  try {
    const sql = `
      SELECT
        COUNT(*) AS n,
        AVG(EXTRACT(EPOCH FROM (ir."updatedAt" - ir."createdAt"))) AS avg_seconds
      FROM issue_reports ir
      WHERE ir.ward_id = :wardId
        AND ir.status = 'RESOLVED'::enum_issue_reports_status
        AND ir."createdAt" IS NOT NULL
        AND ir."updatedAt" IS NOT NULL
        AND ir."updatedAt" > ir."createdAt";
    `;
    const [rows] = await sequelize.query(sql, { replacements: { wardId } });
    const row = Array.isArray(rows) ? rows[0] : rows;
    const n = row && row.n != null ? Number(row.n) : 0;
    const avgSec = row && row.avg_seconds != null ? Number(row.avg_seconds) : null;
    if (n > 0 && Number.isFinite(avgSec)) return avgSec;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Get staff totals for a ward and count how many are currently "busy"
 * Busy = assigned to at least one non-RESOLVED issue in this ward.
 * We try multiple possible assignee column names to support schema variants.
 */
async function getStaffCounts(wardId) {
  try {
    // Total staff linked to the ward
    const [totRows] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM municipal_staff WHERE ward_id = :wardId;`,
      { replacements: { wardId } }
    );
    const staffTotal = Array.isArray(totRows) ? (Number(totRows[0]?.c) || 0) : (Number(totRows?.c) || 0);

    // Busy staff: distinct assignees on non-resolved issues for this ward
    const candidateCols = [
      'assigned_user_id',
      'assignee_user_id',
      'assigned_to_user_id',
      'assigned_to',
      'staff_user_id',
    ];

    let staffBusy = 0;
    for (const col of candidateCols) {
      try {
        const [rows] = await sequelize.query(
          `SELECT COUNT(DISTINCT ${col})::int AS busy
           FROM issue_reports
           WHERE ward_id = :wardId
             AND status <> 'RESOLVED'::enum_issue_reports_status
             AND ${col} IS NOT NULL;`,
          { replacements: { wardId } }
        );
        const row = Array.isArray(rows) ? rows[0] : rows;
        const val = row && row.busy != null ? Number(row.busy) : 0;
        if (Number.isFinite(val)) { staffBusy = val; break; }
      } catch (_) { /* try next column name */ }
    }

    return { staffTotal: Number.isFinite(staffTotal) ? staffTotal : 0, staffBusy: Number.isFinite(staffBusy) ? staffBusy : 0 };
  } catch (_) {
    return { staffTotal: 0, staffBusy: 0 };
  }
}


/**
 * Time-series stats for a ward over the last N days (default 30).
 * Returns daily buckets with { date, new, resolved, open } where:
 *  - new:     issues created on that date
 *  - resolved:issues whose first RESOLVED status-change happened on that date (fallback: issue_reports.updatedAt)
 *  - open:    running total of open issues at end of that date (prev + new - resolved)
 * Query params: ?days=30 (1..180)
 */
exports.statsSeries = async (req, res) => {
  try {
    const { id } = req.params;
    let days = Number(req.query.days || 30);
    if (!Number.isFinite(days) || days < 1) days = 30;
    if (days > 180) days = 180;

    const ward = await Ward.findByPk(id);
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    // Build date range [start .. today] (inclusive) in UTC by date boundaries
    const today = new Date();
    const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())); // 00:00 UTC today
    const startDate = new Date(endDate);
    startDate.setUTCDate(endDate.getUTCDate() - (days - 1)); // n days window

    // Helper to format YYYY-MM-DD
    const ymd = (d) => d.toISOString().slice(0, 10);

    // 1) NEW per day (createdAt)
    const sqlNew = `
      SELECT DATE(ir."createdAt") AS d, COUNT(*)::int AS c
      FROM issue_reports ir
      WHERE ir.ward_id = :wardId
        AND DATE(ir."createdAt") BETWEEN :start::date AND :end::date
      GROUP BY 1
      ORDER BY 1
    `;
    const [newRows] = await sequelize.query(sqlNew, {
      replacements: { wardId: id, start: ymd(startDate), end: ymd(endDate) },
    });
    const newMap = new Map(newRows.map(r => [String(r.d), Number(r.c) || 0]));

    // 2) RESOLVED per day via status_changes first, fallback to issue_reports.updatedAt
    const tryResolved = async (idCol) => {
      const sql = `
        WITH first_res AS (
          SELECT sc.${idCol} AS fk_id, MIN(sc."createdAt") AS resolved_at
          FROM status_changes sc
          WHERE UPPER(sc.to_status) = 'RESOLVED'
          GROUP BY sc.${idCol}
        ),
        candidates AS (
          SELECT ir.id, DATE(fr.resolved_at) AS d
          FROM issue_reports ir
          JOIN first_res fr ON fr.fk_id = ir.id
          WHERE ir.ward_id = :wardId
            AND DATE(fr.resolved_at) BETWEEN :start::date AND :end::date
        )
        SELECT d, COUNT(*)::int AS c
        FROM candidates
        GROUP BY d
        ORDER BY d;
      `;
      const [rows] = await sequelize.query(sql, {
        replacements: { wardId: id, start: ymd(startDate), end: ymd(endDate) },
      });
      return rows;
    };

    let resolvedRows = [];
    try {
      resolvedRows = await tryResolved('issue_id'); // variant 1
      if (!resolvedRows || resolvedRows.length === 0) {
        resolvedRows = await tryResolved('issue_report_id'); // variant 2
      }
    } catch (_) { /* fall through */ }

    // Fallback: use issue_reports updatedAt for currently RESOLVED
    if (!resolvedRows || resolvedRows.length === 0) {
      const sqlResolvedFallback = `
        SELECT DATE(ir."updatedAt") AS d, COUNT(*)::int AS c
        FROM issue_reports ir
        WHERE ir.ward_id = :wardId
          AND ir.status = 'RESOLVED'::enum_issue_reports_status
          AND DATE(ir."updatedAt") BETWEEN :start::date AND :end::date
        GROUP BY 1
        ORDER BY 1
      `;
      const [rows] = await sequelize.query(sqlResolvedFallback, {
        replacements: { wardId: id, start: ymd(startDate), end: ymd(endDate) },
      });
      resolvedRows = rows;
    }
    const resMap = new Map((resolvedRows || []).map(r => [String(r.d), Number(r.c) || 0]));

    // 3) Compute an initial OPEN count before startDate using first resolved_at if available, otherwise updatedAt proxy
    const tryInitialOpen = async (idCol) => {
      const sql = `
        WITH first_res AS (
          SELECT sc.${idCol} AS fk_id, MIN(sc."createdAt") AS resolved_at
          FROM status_changes sc
          WHERE UPPER(sc.to_status) = 'RESOLVED'
          GROUP BY sc.${idCol}
        )
        SELECT COUNT(*)::int AS open_before
        FROM issue_reports ir
        LEFT JOIN first_res fr ON fr.fk_id = ir.id
        WHERE ir.ward_id = :wardId
          AND ir."createdAt" < :start::timestamp
          AND (fr.resolved_at IS NULL OR fr.resolved_at >= :start::timestamp);
      `;
      const [rows] = await sequelize.query(sql, {
        replacements: { wardId: id, start: startDate.toISOString() },
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      return row ? Number(row.open_before) || 0 : 0;
    };

    let initialOpen = 0;
    try {
      initialOpen = await tryInitialOpen('issue_id');
      if (!Number.isFinite(initialOpen) || initialOpen === 0) {
        const alt = await tryInitialOpen('issue_report_id');
        if (Number.isFinite(alt)) initialOpen = alt;
      }
    } catch (_) { /* fall through */ }

    if (!Number.isFinite(initialOpen)) initialOpen = 0;

    // Fallback initialOpen (no status_changes table usable): approximate using updatedAt as resolved_at proxy
    if (initialOpen === 0) {
      const sqlInitialFallback = `
        SELECT COUNT(*)::int AS open_before
        FROM issue_reports ir
        WHERE ir.ward_id = :wardId
          AND ir."createdAt" < :start::timestamp
          AND (ir.status <> 'RESOLVED'::enum_issue_reports_status OR ir."updatedAt" >= :start::timestamp);
      `;
      const [rows] = await sequelize.query(sqlInitialFallback, {
        replacements: { wardId: id, start: startDate.toISOString() },
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      initialOpen = row ? Number(row.open_before) || 0 : 0;
    }

    // 4) Build series by iterating dates and computing running open
    const series = [];
    let runningOpen = initialOpen;
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      const key = ymd(d);
      const added = newMap.get(key) || 0;
      const resolved = resMap.get(key) || 0;
      runningOpen = Math.max(0, runningOpen + added - resolved);
      series.push({ date: key, new: added, resolved, open: runningOpen });
    }

    return res.json({
      success: true,
      message: 'Ward time-series stats loaded',
      data: { days, series },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

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
    let newCount = 0
    let acknowledged = 0
    let inProgress = 0
    let resolved = 0
    for (const r of issues) {
      total += 1
      const status = String(r.status || '').toUpperCase()
      switch (status) {
        case 'NEW':
          newCount += 1
          break
        case 'ACKNOWLEDGED':
          acknowledged += 1
          break
        case 'IN_PROGRESS':
          inProgress += 1
          break
        case 'RESOLVED':
          resolved += 1
          break
        default:
          break
      }
    }

    const pending = acknowledged + inProgress
    const closed = resolved
    const open = Math.max(0, total - closed - pending) // effectively equals NEW count
    // Compute average from ACKNOWLEDGED → RESOLVED using status_changes (ward-bounded) with FK name fallback
    let avgResolution = await computeAvgResolutionSeconds(id);
    const { staffTotal, staffBusy } = await getStaffCounts(id);

    return res.json({
      success: true,
      message: 'Ward stats loaded',
      data: {
        open,          // NEW
        closed,        // RESOLVED
        pending,       // ACKNOWLEDGED + IN_PROGRESS
        breakdown: { new: newCount, acknowledged, in_progress: inProgress, resolved },
        avgResolution, // seconds
        staffTotal,
        staffBusy,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

//  Average resolution time (ACKNOWLEDGED → RESOLVED) for a ward
exports.avgResolutionTime = async (req, res) => {
  try {
    const { id } = req.params
    const ward = await Ward.findByPk(id)
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' })

    const avgResolution = await computeAvgResolutionSeconds(id);

    return res.json({
      success: true,
      message: 'Average resolution time computed (ACK → RESOLVED)',
      data: {
        wardId: Number(id),
        avgResolutionSeconds: avgResolution, // null if no pairs, 0 allowed
      },
    })
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message })
  }
}

//  Issues by category for a ward
exports.statsCategories = async (req, res) => {
  try {
    const { id } = req.params;
    const ward = await Ward.findByPk(id);
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    // Group by category (enum_issue_reports_category)
    const sql = `
      SELECT LOWER(CAST(ir.category AS text)) AS label, COUNT(*)::int AS count
      FROM issue_reports ir
      WHERE ir.ward_id = :wardId
      GROUP BY 1
      ORDER BY 2 DESC, 1 ASC;
    `;
    const [rows] = await sequelize.query(sql, { replacements: { wardId: id } });

    // Normalise to { label, count }
    const categories = (Array.isArray(rows) ? rows : [rows])
      .filter(Boolean)
      .map(r => ({ label: String(r.label || '').replace(/_/g, ' ').trim(), count: Number(r.count) || 0 }))
      .filter(x => x.label);

    return res.json({ success: true, message: 'Categories loaded', data: { categories } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};