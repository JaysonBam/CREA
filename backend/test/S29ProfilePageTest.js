const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

// Models + controller
const models = require('../models');
const { Ward } = models;
const controller = require('../controllers/WardController');

const JWT_SECRET = 'secret'; // align with your .env for tests

// ---- Tiny auth + RBAC middlewares for the test app ----
function auth(req, res, next) {
  try {
    const hdr = req.get('Authorization') || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
function ensureWardLeader(req, res, next) {
  const { user } = req;
  const { id } = req.params;
  if (!user || user.role !== 'Leader') {
    return res.status(403).json({ success: false, message: 'Forbidden: not a Leader' });
  }
  if (String(user.wardId || '') !== String(id)) {
    return res.status(403).json({ success: false, message: 'Forbidden: wrong ward' });
  }
  return next();
}

// ---- Build a minimal app that mounts WardController with the RBAC middlewares ----
function makeApp() {
  const app = express();
  app.use(bodyParser.json());
  app.put('/api/wards/:id/staff', auth, ensureWardLeader, controller.setStaff);
  app.put('/api/wards/:id/leader', auth, ensureWardLeader, controller.setLeader);
  // error surface
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  });
  return app;
}

function tokenOf(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('SCRUM 29 — RBAC (only Leader of a ward may manage it)', () => {
  let app;
  let wardFindByPk;
  let destroyStaff, bulkCreateStaff;
  let destroyLeader, createLeader;
  let userFindByPk;

  beforeEach(() => {
    app = makeApp();

    // Stubs for data layer used by setStaff + setLeader
    wardFindByPk = sinon.stub(Ward, 'findByPk').callsFake(async (id) => ({ id }));
    const { MunicipalStaff, CommunityLeader, User } = require('../models');
    destroyStaff = sinon.stub(MunicipalStaff, 'destroy').resolves(1);
    bulkCreateStaff = sinon.stub(MunicipalStaff, 'bulkCreate').resolves([{ ward_id: 'w1', user_id: 'u1' }]);
    destroyLeader = sinon.stub(CommunityLeader, 'destroy').resolves(1);
    createLeader = sinon.stub(CommunityLeader, 'create').resolves({ ward_id: 'w1', user_id: 'L1' });
    userFindByPk = sinon.stub(User, 'findByPk').callsFake(async (id) => ({ id })); // used by setLeader
  });

  afterEach(() => sinon.restore());

  // ---------- Helpers ----------
  const as = (t) => (t ? { Authorization: `Bearer ${t}` } : {});

  // ---------- setStaff ----------
  it('401 when no token on setStaff', async () => {
    const res = await request(app).put('/api/wards/w1/staff').send({ staffUserIds: ['u1'] });
    expect(res.status).to.equal(401);
  });

  it('403 when user is not a Leader on setStaff', async () => {
    const token = tokenOf({ id: 'U', role: 'Staff', wardId: 'w1' });
    const res = await request(app).put('/api/wards/w1/staff').set(as(token)).send({ staffUserIds: ['u1'] });
    expect(res.status).to.equal(403);
    expect(res.body.message).to.match(/not a Leader/i);
  });

  it('403 when Leader of a different ward hits setStaff', async () => {
    const token = tokenOf({ id: 'L', role: 'Leader', wardId: 'w2' }); // not w1
    const res = await request(app).put('/api/wards/w1/staff').set(as(token)).send({ staffUserIds: ['u1'] });
    expect(res.status).to.equal(403);
    expect(res.body.message).to.match(/wrong ward/i);
  });

  it('200 when correct Leader updates staff for their ward', async () => {
    const token = tokenOf({ id: 'L', role: 'Leader', wardId: 'w1' });
    const res = await request(app).put('/api/wards/w1/staff').set(as(token)).send({ staffUserIds: ['u1'] });
    expect(res.status).to.equal(200);
    // verify writes
    expect(wardFindByPk.calledWith('w1')).to.equal(true);
    expect(destroyStaff.called).to.equal(true);
    expect(bulkCreateStaff.calledOnce).to.equal(true);
  });

  // ---------- setLeader ----------
  it('401 when no token on setLeader', async () => {
    const res = await request(app).put('/api/wards/w1/leader').send({ leaderUserId: 'L1' });
    expect(res.status).to.equal(401);
  });

  it('403 when non-Leader hits setLeader', async () => {
    const token = tokenOf({ id: 'U', role: 'Staff', wardId: 'w1' });
    const res = await request(app).put('/api/wards/w1/leader').set(as(token)).send({ leaderUserId: 'L1' });
    expect(res.status).to.equal(403);
  });

  it('403 when Leader of another ward hits setLeader', async () => {
    const token = tokenOf({ id: 'L', role: 'Leader', wardId: 'w2' });
    const res = await request(app).put('/api/wards/w1/leader').set(as(token)).send({ leaderUserId: 'L1' });
    expect(res.status).to.equal(403);
  });

  it('200 when correct Leader sets leader for their ward', async () => {
    const token = tokenOf({ id: 'L', role: 'Leader', wardId: 'w1' });
    const res = await request(app).put('/api/wards/w1/leader').set(as(token)).send({ leaderUserId: 'L1' });
    expect(res.status).to.equal(200);
    expect(wardFindByPk.calledWith('w1')).to.equal(true);
    expect(destroyLeader.calledOnce).to.equal(true);
    expect(createLeader.calledOnce).to.equal(true);
    expect(userFindByPk.calledWith('L1')).to.equal(true);
  });
});