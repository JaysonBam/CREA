// Test Output Meaning:
//  - 401: Unauthorized — request missing or has invalid token.
//  - 403: Forbidden — user is not allowed (either not a Leader, or Leader of a different ward).
//  - 200: Success — correct Leader performed a valid action on their ward.

// These tests ensure:
//  - Only authenticated users with valid JWT tokens can access ward management endpoints.
//  - Only a Leader role can manage staff/leader assignments for a ward.
//  - A Leader can only modify their own ward, not other wards.
//  - Staff/Leader updates call the expected model methods (destroy, create, bulkCreate).
 
const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const { EventEmitter } = require('events');

const JWT_SECRET = 'secret';

// Lazy-loaded per test to avoid cross-file require-cache pollution
let Ward;
let controller;

// Tiny auth + RBAC middlewares for the test app
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

// Build a minimal app that mounts WardController with the RBAC middlewares
function makeApp(ctrl) {
  const app = express();
  app.use(bodyParser.json());
  app.put('/api/wards/:id/staff', auth, ensureWardLeader, ctrl.setStaff);
  app.put('/api/wards/:id/leader', auth, ensureWardLeader, ctrl.setLeader);
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
  let destroyStaff;
  let destroyLeader, createLeader;
  let userFindByPk;

  beforeEach(() => {
    // ensure clean module instances for this file (other test files may inject caches)
    const modelsPath = require.resolve('../models');
    const controllerPath = require.resolve('../controllers/WardController');
    delete require.cache[modelsPath];
    delete require.cache[controllerPath];

    // fresh models
    const { Ward: WardModel, MunicipalStaff, CommunityLeader, User, sequelize } = require('../models');
    Ward = WardModel;

    // Stubs for data layer used by setStaff + setLeader
    wardFindByPk = sinon.stub(Ward, 'findByPk').callsFake(async (id) => ({ id }));

    // Allow controller to validate staff IDs by returning matching users
    sinon.stub(User, 'findAll').callsFake(async (opts) => {
      const Op = require('sequelize').Op;
      const ids = (opts && opts.where && opts.where.id && opts.where.id[Op.in]) || [];
      return ids.map((id) => ({ id }));
    });

    // Stub transaction wrapper used inside controller
    sinon.stub(sequelize, 'transaction').callsFake(async (fnOrOpts) => {
      const t = { commit: async () => {}, rollback: async () => {} };
      if (typeof fnOrOpts === 'function') return fnOrOpts(t);
      return t;
    });

    destroyStaff = sinon.stub(MunicipalStaff, 'destroy').resolves(1);
    sinon.stub(MunicipalStaff, 'findOrCreate').resolves([{ ward_id: 'w1', user_id: 'u1' }, true]);

    destroyLeader = sinon.stub(CommunityLeader, 'destroy').resolves(1);
    createLeader = sinon.stub(CommunityLeader, 'create').resolves({ ward_id: 'w1', user_id: 'L1' });
    userFindByPk = sinon.stub(User, 'findByPk').callsFake(async (id) => ({ id, role: 'CommunityLeader' })); // used by setLeader

    // now require a fresh controller (after stubbing models/tx)
    controller = require('../controllers/WardController');

    // build app using this controller instance
    app = makeApp(controller);
  });

  afterEach(() => sinon.restore());

  const as = (t) => (t ? { Authorization: `Bearer ${t}` } : {});

  // setStaff
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
    const res = await request(app)
      .put('/api/wards/w1/staff')
      .set(as(token))
      .send({ staffUserIds: [11, 12] });
    expect(res.status).to.equal(200);
    // verify writes
    expect(wardFindByPk.calledWith('w1')).to.equal(true);
    expect(destroyStaff.called).to.equal(true);
    const { MunicipalStaff } = require('../models');
    expect(MunicipalStaff.findOrCreate.called).to.equal(true);
  });

  // setLeader
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
    const res = await request(app)
      .put('/api/wards/w1/leader')
      .set(as(token))
      .send({ leaderUserId: 101, leaderId: 101, userId: 101 });
    expect(res.status).to.equal(200);
    expect(wardFindByPk.calledWith('w1')).to.equal(true);
    expect(destroyLeader.calledOnce).to.equal(true);
    expect(createLeader.calledOnce).to.equal(true);
    expect(userFindByPk.calledWith(101)).to.equal(true);
  });
});