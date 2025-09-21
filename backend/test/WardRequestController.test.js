
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
// Mock the auth middleware to always authenticate as the test user/role
jest.mock('../middleware/auth', () => (req, res, next) => {
  // Use headers to simulate user/role in tests
  req.user = {
    role: req.headers['x-test-role'] || 'staff',
    user_id: req.headers['x-test-userid'] || 1
  };
  next();
});
const wardRequestRoutes = require('../routes/WardRequestRoutes');
const { sequelize, User, Ward, WardRequest, MunicipalStaff, CommunityLeader } = require('../models');

// Dummy auth middleware for testing
function fakeAuth(role, userId) {
  return (req, res, next) => {
    req.user = { role, user_id: userId };
    next();
  };
}

describe('WardRequestController', () => {
  let app, staffUser, comLeaderUser, adminUser, ward;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    ward = await Ward.create({ name: 'Test Ward', code: 'TW' });
    staffUser = await User.create({ first_name: 'Staff', last_name: 'User', email: 'staff@test.com', phone: '123', password: 'pass', role: 'staff', isActive: true });
    comLeaderUser = await User.create({ first_name: 'Com', last_name: 'Leader', email: 'com@test.com', phone: '456', password: 'pass', role: 'communityleader', isActive: true });
    adminUser = await User.create({ first_name: 'Admin', last_name: 'User', email: 'admin@test.com', phone: '789', password: 'pass', role: 'admin', isActive: true });

    // Patch MunicipalStaff.create and CommunityLeader.create to always provide a token
    const { MunicipalStaff, CommunityLeader } = require('../models');
    const origStaffCreate = MunicipalStaff.create;
    MunicipalStaff.create = async function (values, options) {
      if (!values.token) values.token = uuidv4();
      return origStaffCreate.call(this, values, options);
    };
    const origLeaderCreate = CommunityLeader.create;
    CommunityLeader.create = async function (values, options) {
      if (!values.token) values.token = uuidv4();
      return origLeaderCreate.call(this, values, options);
    };

    app = express();
    app.use(bodyParser.json());
    // Mount routes with fake auth for each test
    app.use((req, res, next) => { req.realUrl = req.url; next(); });
    app.use('/api/ward-requests', wardRequestRoutes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a ward request for staff', async () => {
    const res = await request(app)
      .post('/api/ward-requests')
      .set('x-test-role', 'staff')
      .set('x-test-userid', staffUser.id)
      .send({ message: 'Please assign me', ward_id: ward.id, job_description: 'Test Job' });
    expect(res.statusCode).toBe(201);
    expect(res.body.request).toHaveProperty('id');
    expect(res.body.request.job_description).toBe('Test Job');
  });

  it('should create a ward request for community leader', async () => {
    const res = await request(app)
      .post('/api/ward-requests')
      .set('x-test-role', 'communityleader')
      .set('x-test-userid', comLeaderUser.id)
      .send({ message: 'I want to lead', ward_id: ward.id });
    expect(res.statusCode).toBe(201);
    expect(res.body.request.job_description).toBe('community leader');
  });

  it('should list pending requests for admin', async () => {
    const res = await request(app)
      .get('/api/ward-requests')
      .set('x-test-role', 'admin')
      .set('x-test-userid', adminUser.id);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('should show the full request chain for a user', async () => {
    const res = await request(app)
      .get(`/api/ward-requests/chain/${staffUser.id}`)
      .set('x-test-role', 'admin')
      .set('x-test-userid', adminUser.id);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

});
