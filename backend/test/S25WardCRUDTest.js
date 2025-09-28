// test/WardCRUDTest.js (CRUD-only, no external DI libs)
/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');

// handy response mock
function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return res;
}

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

  const controllerPath = require.resolve('../controllers/WardController.js');
  delete require.cache[controllerPath];
  // eslint-disable-next-line global-require
  const controller = require(controllerPath);
  return { controller, modelsPath, controllerPath };
}

describe('WardController CRUD (unit, stubbed models)', () => {
  let Ward, CommunityLeader, MunicipalStaff, sequelize;
  let controller;
  let modelsPath;
  let controllerPath;

  beforeEach(() => {
    // fresh stubs for each test
    Ward = {
      findAll: sinon.stub(),
      findByPk: sinon.stub(),
      create: sinon.stub(),
      count: sinon.stub(),
      scope: undefined,
      options: {}
    };
    CommunityLeader = { destroy: sinon.stub(), create: sinon.stub() };
    MunicipalStaff = { destroy: sinon.stub(), findOrCreate: sinon.stub() };
    sequelize = { query: sinon.stub(), transaction: async () => ({ commit: async () => {}, rollback: async () => {} }) };

    const fakes = { sequelize, Ward, CommunityLeader, MunicipalStaff };
    const loaded = loadControllerWithFakes(fakes);
    controller = loaded.controller;
    modelsPath = loaded.modelsPath;
    controllerPath = loaded.controllerPath;
  });

  afterEach(() => {
    sinon.restore();
    // clean caches to avoid cross-test pollution
    if (modelsPath) delete require.cache[modelsPath];
    if (controllerPath) delete require.cache[controllerPath];
  });

  describe('list', () => {
    it('returns wards with minimal fields', async () => {
      Ward.findAll.resolves([
        { id: 1, name: 'Alpha', code: 'ALPHA' },
        { id: 2, name: 'Beta', code: 'BETA' },
      ]);
      const req = {};
      const res = makeRes();

      await controller.list(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.length(2);
      expect(Ward.findAll.calledOnce).to.be.true;
    });
  });

  describe('create', () => {
    it('creates a ward (name required, code generated & deduped)', async () => {
      // uniqueCode() loops while Ward.count(...) > 0; first 0 means unique on first try
      Ward.count.resolves(0);
      Ward.create.resolves({ id: 9, name: 'Ward One', code: 'WARD-ONE' });

      const req = { body: { name: ' Ward One ' } };
      const res = makeRes();

      await controller.create(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(Ward.create.calledOnce).to.be.true;
      // ensure count was asked at least once to confirm uniqueness
      expect(Ward.count.called).to.be.true;
    });

    it('400 when name missing', async () => {
      const req = { body: {} };
      const res = makeRes();

      await controller.create(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.body.success).to.be.false;
    });
  });

  describe('update', () => {
    it('updates a ward name', async () => {
      const fakeWard = { id: 3, name: 'Old', code: 'OLD', save: sinon.stub().resolves() };
      Ward.findByPk.resolves(fakeWard);

      const req = { params: { id: 3 }, body: { name: 'New Name' } };
      const res = makeRes();

      await controller.update(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(fakeWard.save.calledOnce).to.be.true;
      expect(fakeWard.name).to.equal('New Name');
    });

    it('404 when ward not found', async () => {
      Ward.findByPk.resolves(null);

      const req = { params: { id: 99 }, body: { name: 'X' } };
      const res = makeRes();

      await controller.update(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res.body.success).to.be.false;
    });
  });

  describe('remove', () => {
    it('deletes a ward (and cleans relations)', async () => {
      const fakeWard = { id: 7, destroy: sinon.stub().resolves() };
      Ward.findByPk.resolves(fakeWard);
      CommunityLeader.destroy.resolves(1);
      MunicipalStaff.destroy.resolves(2);

      const req = { params: { id: 7 } };
      const res = makeRes();

      await controller.remove(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(CommunityLeader.destroy.calledOnce).to.be.true;
      expect(MunicipalStaff.destroy.calledOnce).to.be.true;
      expect(fakeWard.destroy.calledOnce).to.be.true;
    });

    it('404 when ward not found', async () => {
      Ward.findByPk.resolves(null);

      const req = { params: { id: 404 } };
      const res = makeRes();

      await controller.remove(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res.body.success).to.be.false;
    });
  });
});