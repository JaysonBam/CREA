const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Mock the auth middleware so every request is authenticated as a test user/role
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = {
    role: req.headers['x-test-role'] || 'staff',
    user_id: req.headers['x-test-userid'] || 1
  };
  next();
});

// Import the routes and models to be tested
const wardRequestRoutes = require('../routes/WardRequestRoutes');
const { sequelize, User, Ward, MunicipalStaff, CommunityLeader } = require('../models');

describe('WardRequestController', () => {
  let app, staffUser, comLeaderUser, adminUser, ward;

  // Set up the test database and Express app before running tests
  beforeAll(async () => {
    // Reset the database
    await sequelize.sync({ force: true });
    // test data
    ward = await Ward.create({ name: 'Test Ward', code: 'TW' });
    staffUser = await User.create({ first_name: 'Staff', last_name: 'User', email: 'staff@test.com', phone: '123', password: 'pass', role: 'staff', isActive: true });
    comLeaderUser = await User.create({ first_name: 'Com', last_name: 'Leader', email: 'com@test.com', phone: '456', password: 'pass', role: 'communityleader', isActive: true });
    adminUser = await User.create({ first_name: 'Admin', last_name: 'User', email: 'admin@test.com', phone: '789', password: 'pass', role: 'admin', isActive: true });

    // Patch create methods to always provide a token (simulate real DB behavior)
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

    // Set up the Express app and mount the routes
    app = express();
    app.use(bodyParser.json());
    // Attach a realUrl property for debugging (optional)
    app.use((req, res, next) => { req.realUrl = req.url; next(); });
    app.use('/api/ward-requests', wardRequestRoutes);
  });

  // Clean up the database connection after all tests
  afterAll(async () => {
    await sequelize.close();
  });


  // Test: Staff can create a ward join request
  it('should create a ward request for staff', async () => {
    const res = await request(app)
      .post('/api/ward-requests')
      .set('x-test-role', 'staff')
      .set('x-test-userid', staffUser.id)
      .send({ message: 'Please assign me', ward_id: ward.id, job_description: 'Test Job' });
    expect(res.statusCode).toBe(201);//created
    expect(res.body.request).toHaveProperty('id');
    expect(res.body.request.job_description).toBe('Test Job');//correct
  });


  // Test: Community leader can create a ward join request
  it('should create a ward request for community leader', async () => {
    const res = await request(app)
      .post('/api/ward-requests')
      .set('x-test-role', 'communityleader')
      .set('x-test-userid', comLeaderUser.id)
      .send({ message: 'I want to lead', ward_id: ward.id });
    expect(res.statusCode).toBe(201);
    expect(res.body.request.job_description).toBe('community leader');
  });


  // Test: Admin can list all pending ward requests
  it('should list pending requests for admin', async () => {
    const res = await request(app)
      .get('/api/ward-requests')
      .set('x-test-role', 'admin')
      .set('x-test-userid', adminUser.id);
    expect(res.statusCode).toBe(200);//ok
    expect(Array.isArray(res.body.requests)).toBe(true);
  });


  // Test: Admin can view the full request chain for a user
  it('should show the full request chain for a user', async () => {
    const res = await request(app)
      .get(`/api/ward-requests/chain/${staffUser.id}`)
      .set('x-test-role', 'admin')
      .set('x-test-userid', adminUser.id);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

});
