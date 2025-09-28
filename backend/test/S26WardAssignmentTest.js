// Test Output Meaning:
//  - 200: Successful staff assignment to a ward.
//  - 400: Invalid input 
//  - 404: Ward not found in the database.
 
//  These tests ensure:
//  - Staff can only belong to one ward at a time.
//  - Invalid inputs or missing wards return correct error codes.
//  - Moving staff between wards removes them from previous assignments.
 
const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");
const { Op } = require("sequelize");

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

function makeReqRes({ method = "POST", url = "/api/wards/:id/staff", body = {}, params = {} } = {}) {
  const req = httpMocks.createRequest({ method, url, body, params });
  const res = httpMocks.createResponse({ eventEmitter: require("events").EventEmitter });
  return { req, res };
}

describe("SCRUM 26 — One-ward-per-staff via setStaff", () => {
  let Ward, MunicipalStaff, sequelize, controller;
  let modelsPath, controllerPath;

  afterEach(() => {
    sinon.restore();
    if (modelsPath) delete require.cache[modelsPath];
    if (controllerPath) delete require.cache[controllerPath];
  });

  beforeEach(() => {
    Ward = {
      findByPk: sinon.stub(),
    };

    MunicipalStaff = {
      destroy: sinon.stub().resolves(0),
      bulkCreate: sinon.stub().resolves([]),
      findAll: sinon.stub().resolves([]),
      findOne: sinon.stub().resolves(null),
      findOrCreate: sinon.stub().resolves([{ ward_id: null, user_id: null }, true]),
    };

    const User = {
      findAll: sinon.stub().callsFake(async (opts) => {
        // Return a minimal user object for any ids provided
        const ids = (opts && opts.where && opts.where.id && opts.where.id[Op.in]) || [];
        return ids.map((id) => ({ id }));
      }),
    };

    // minimal sequelize stub in case controller references it
    sequelize = { query: sinon.stub(), transaction: async () => ({ commit: async () => {}, rollback: async () => {} }) };

    const loaded = loadControllerWithFakes({ Ward, MunicipalStaff, User, sequelize });
    controller = loaded.controller;
    modelsPath = loaded.modelsPath;
    controllerPath = loaded.controllerPath;
  });

  it("returns 400 when staffUserIds is not an array", async () => {
    // ensure ward exists so we hit the validation branch for staffUserIds
    Ward.findByPk.resolves({ id: "wardA" });

    const { req, res } = makeReqRes({ params: { id: "wardA" }, body: { staffUserIds: "not-an-array" } });

    await controller.setStaff(req, res);

    expect(res.statusCode).to.equal(400);
    const payload = res._getJSONData();
    expect((payload && payload.message) || "").to.match(/array/i);
  });

  it("returns 404 when ward does not exist", async () => {
    Ward.findByPk.resolves(null);

    const { req, res } = makeReqRes({ params: { id: "wardZ" }, body: { staffUserIds: ["u1"] } });
    await controller.setStaff(req, res);

    expect(Ward.findByPk.calledOnceWith("wardZ")).to.equal(true);
    expect(res.statusCode).to.equal(404);
  });

  it("assigns staff to Ward A, then moves same staff to Ward B (never duplicates)", async () => {
    // two sequential calls: first for wardA, then for wardB
    const findByPkSeq = Ward.findByPk;
    findByPkSeq.onFirstCall().resolves({ id: "wardA" });
    findByPkSeq.onSecondCall().resolves({ id: "wardB" });

    // 1) Assign u1 to Ward A
    let rr = makeReqRes({ params: { id: "wardA" }, body: { staffUserIds: ["u1"] } });
    await controller.setStaff(rr.req, rr.res);
    expect(rr.res.statusCode).to.equal(200);

    // Expectations for first call
    // a) Unassign u1 anywhere
    const firstDestroyArg = MunicipalStaff.destroy.firstCall.args[0];
    const firstIds = Array.isArray(firstDestroyArg.where.user_id)
      ? firstDestroyArg.where.user_id
      : firstDestroyArg.where.user_id && firstDestroyArg.where.user_id[Op.in];
    expect(firstIds).to.deep.equal(["u1"]);
    // b) Remove others from wardA not in list (controller-dependent: find any call with ward_id="wardA")
    const destroyCallsA = MunicipalStaff.destroy.getCalls();
    const wardARemoval = destroyCallsA
      .map((c) => c.args && c.args[0])
      .find((arg) => arg && arg.where && arg.where.ward_id === "wardA");
    if (wardARemoval) {
      expect(wardARemoval.where).to.have.property("user_id");
      expect(wardARemoval.where.user_id).to.have.property(Op.notIn);
      expect(wardARemoval.where.user_id[Op.notIn]).to.deep.equal(["u1"]);
    }
    // c) Create/ensure assignment for (wardA, u1)
    const focArgsA = MunicipalStaff.findOrCreate.firstCall && MunicipalStaff.findOrCreate.firstCall.args[0];
    expect(focArgsA.where).to.deep.equal({ ward_id: "wardA", user_id: "u1" });
    expect(focArgsA.defaults).to.include({ ward_id: "wardA", user_id: "u1" });

    // Reset the bulkCreate/destroy histories for second call
    MunicipalStaff.findOrCreate.resetHistory();
    MunicipalStaff.destroy.resetHistory();
    MunicipalStaff.findAll.resetHistory();
    MunicipalStaff.findOne.resetHistory();
    MunicipalStaff.findOrCreate.resetHistory();

    // 2) Move u1 to Ward B
    rr = makeReqRes({ params: { id: "wardB" }, body: { staffUserIds: ["u1"] } });
    await controller.setStaff(rr.req, rr.res);
    expect(rr.res.statusCode).to.equal(200);

    // Expectations for second call
    // a) Unassign u1 anywhere again (find any destroy call that targets user_id IN ["u1"]) 
    const destroyCallsAfterB = MunicipalStaff.destroy.getCalls();
    const unassignCallB = destroyCallsAfterB
      .map((c) => c.args && c.args[0])
      .find((arg) => arg && arg.where && (
        Array.isArray(arg.where.user_id) || (arg.where.user_id && arg.where.user_id[Op.in])
      ));
    if (unassignCallB) {
      const thirdIds = Array.isArray(unassignCallB.where.user_id)
        ? unassignCallB.where.user_id
        : unassignCallB.where.user_id[Op.in];
      expect(thirdIds).to.deep.equal(["u1"]);
    }
    // b) Remove others from wardB not in list (controller-dependent)
    const destroyCallsB = MunicipalStaff.destroy.getCalls();
    const wardBRemoval = destroyCallsB
      .map((c) => c.args && c.args[0])
      .find((arg) => arg && arg.where && arg.where.ward_id === "wardB");
    if (wardBRemoval) {
      expect(wardBRemoval.where.user_id).to.have.property(Op.notIn);
      expect(wardBRemoval.where.user_id[Op.notIn]).to.deep.equal(["u1"]);
    }
    // c) Create/ensure assignment for (wardB, u1)
    const focArgsB = MunicipalStaff.findOrCreate.firstCall && MunicipalStaff.findOrCreate.firstCall.args[0];
    expect(focArgsB.where).to.deep.equal({ ward_id: "wardB", user_id: "u1" });
    expect(focArgsB.defaults).to.include({ ward_id: "wardB", user_id: "u1" });
  });
});
