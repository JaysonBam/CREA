// SCRUM 28 — Ward statistics & analytics
// Unit tests against WardController.stats and WardController.avgResolutionTime
// Uses require-cache injection to stub Sequelize models and sequelize.query

/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const sinon = require('sinon');

// helper to inject fake ../models before requiring the controller
function loadControllerWithFakes(fakes) {
  const modelsPath = require.resolve('../models');
  // inject fake models into require cache
  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: fakes,
  };

  const controllerPath = require.resolve('../controllers/WardController');
  delete require.cache[controllerPath];
  // eslint-disable-next-line global-require
  const controller = require(controllerPath);
  return { controller, modelsPath, controllerPath };
}

// handy response mock
function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

describe('SCRUM 28 — Ward statistics & analytics', () => {
  let Ward, IssueReport, sequelize;
  let controller;
  let modelsPath;
  let controllerPath;

  beforeEach(() => {
    Ward = { findByPk: sinon.stub() };
    IssueReport = { findAll: sinon.stub() };
    sequelize = {
      query: sinon.stub(),
      transaction: async () => ({ commit: async () => {}, rollback: async () => {} }),
    };

    const loaded = loadControllerWithFakes({ Ward, IssueReport, sequelize });
    controller = loaded.controller;
    modelsPath = loaded.modelsPath;
    controllerPath = loaded.controllerPath;
  });

  afterEach(() => {
    sinon.restore();
    if (modelsPath) delete require.cache[modelsPath];
    if (controllerPath) delete require.cache[controllerPath];
  });

  describe('stats()', () => {
    it('404 when ward not found', async () => {
      Ward.findByPk.resolves(null);
      const req = { params: { id: 123 } };
      const res = makeRes();

      await controller.stats(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res.body && res.body.success).to.be.false;
    });

    it('returns counts and avgResolution when ward exists (fallback query path)', async () => {
      Ward.findByPk.resolves({ id: 1 });
      // Provide a mix of statuses
      IssueReport.findAll.resolves([
        { id: 1, status: 'NEW' },
        { id: 2, status: 'ACKNOWLEDGED' },
        { id: 3, status: 'IN_PROGRESS' },
        { id: 4, status: 'RESOLVED' },
        { id: 5, status: 'RESOLVED' },
      ]);

      // computeAvgResolutionSeconds likely tries multiple queries.
      // Simulate two failed/unsupported attempts, then a fallback that succeeds with 5400s (1.5h).
      // Controller now uses a single issue_reports-based query for avg resolution.
      sequelize.query.resolves([[{ n: '2', avg_seconds: '5400' }]]);

      const req = { params: { id: 1 } };
      const res = makeRes();

      await controller.stats(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.body.success).to.be.true;
      const d = res.body.data;
      expect(d.breakdown.new).to.equal(1);
      expect(d.breakdown.acknowledged).to.equal(1);
      expect(d.breakdown.in_progress).to.equal(1);
      expect(d.breakdown.resolved).to.equal(2);
      expect(d.closed).to.equal(2);
      expect(d.pending).to.equal(2); // ACK + IN_PROGRESS
      expect(d.avgResolution).to.equal(5400);
    });
  });

  describe('avgResolutionTime()', () => {
    it('404 when ward not found', async () => {
      Ward.findByPk.resolves(null);
      const req = { params: { id: 9 } };
      const res = makeRes();

      await controller.avgResolutionTime(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res.body && res.body.success).to.be.false;
    });

    it('returns avgResolutionSeconds via primary status_changes path', async () => {
      Ward.findByPk.resolves({ id: 2 });
      // Single query returns an average of 120 seconds
      sequelize.query.resolves([[{ n: '3', avg_seconds: '120' }]]);

      const req = { params: { id: 2 } };
      const res = makeRes();

      await controller.avgResolutionTime(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.avgResolutionSeconds).to.equal(120);
    });

    it('returns null when no resolution time can be computed', async () => {
      Ward.findByPk.resolves({ id: 3 });
      // Single query returns no rows
      sequelize.query.resolves([[]]);

      const req = { params: { id: 3 } };
      const res = makeRes();

      await controller.avgResolutionTime(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.avgResolutionSeconds).to.equal(null);
    });
  });
});