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

// Models
const models = require("../models");
const { Ward } = models;

// access MunicipalStaff dynamically inside tests to avoid circular requires

// Controller
const controller = require("../controllers/WardController");

function makeReqRes({ method = "POST", url = "/api/wards/:id/staff", body = {}, params = {} } = {}) {
  const req = httpMocks.createRequest({ method, url, body, params });
  const res = httpMocks.createResponse({ eventEmitter: require("events").EventEmitter });
  return { req, res };
}

// Helper to get Op.notIn without importing Op at top-level
const { Op } = require("sequelize");

describe("SCRUM 26 — One-ward-per-staff via setStaff", () => {
  let findWardStub, destroyStaffStub, bulkCreateStaffStub;

  afterEach(() => sinon.restore());

  it("returns 400 when staffUserIds is not an array", async () => {
    const { req, res } = makeReqRes({ params: { id: "wardA" }, body: { staffUserIds: "not-an-array" } });

    await controller.setStaff(req, res);
    expect(res.statusCode).to.equal(400);
    const payload = res._getJSONData();
    expect((payload && payload.message) || "").to.match(/array/i);
  });

  it("returns 404 when ward does not exist", async () => {
    findWardStub = sinon.stub(Ward, "findByPk").resolves(null);

    const { req, res } = makeReqRes({ params: { id: "wardZ" }, body: { staffUserIds: ["u1"] } });
    await controller.setStaff(req, res);

    expect(findWardStub.calledOnceWith("wardZ")).to.equal(true);
    expect(res.statusCode).to.equal(404);
  });

  it("assigns staff to Ward A, then moves same staff to Ward B (never duplicates)", async () => {
    // Arrange - two wards exist
    const wardA = { id: "wardA" };
    const wardB = { id: "wardB" };

    const findByPkSeq = sinon.stub(Ward, "findByPk");
    findByPkSeq.onFirstCall().resolves(wardA); // for first setStaff
    findByPkSeq.onSecondCall().resolves(wardB); // for second setStaff

    // MunicipalStaff model methods — resolve from models dynamically
    const { MunicipalStaff } = require("../models");
    destroyStaffStub = sinon.stub(MunicipalStaff, "destroy").resolves(1);
    bulkCreateStaffStub = sinon.stub(MunicipalStaff, "bulkCreate").resolves([{ ward_id: "wardA", user_id: "u1" }]);

    // 1) Assign u1 to Ward A
    let rr = makeReqRes({ params: { id: "wardA" }, body: { staffUserIds: ["u1"] } });
    await controller.setStaff(rr.req, rr.res);
    expect(rr.res.statusCode).to.equal(200);

    // Expectations for first call
    // a) Unassign u1 anywhere
    expect(destroyStaffStub.firstCall.args[0]).to.deep.equal({ where: { user_id: ["u1"] } });
    // b) Remove others from wardA not in list
    const secondArgs = destroyStaffStub.secondCall.args[0];
    expect(secondArgs).to.have.property("where");
    expect(secondArgs.where).to.have.property("ward_id", "wardA");
    expect(secondArgs.where).to.have.property("user_id");
    expect(secondArgs.where.user_id).to.have.property(Op.notIn);
    expect(secondArgs.where.user_id[Op.notIn]).to.deep.equal(["u1"]);
    // c) Create assignment for (wardA, u1)
    expect(bulkCreateStaffStub.firstCall.args[0]).to.deep.equal([{ ward_id: "wardA", user_id: "u1" }]);
    expect(bulkCreateStaffStub.firstCall.args[1]).to.include({ ignoreDuplicates: true });

    // Reset the bulkCreate resolved value for second call
    bulkCreateStaffStub.resetHistory();
    destroyStaffStub.resetHistory();

    // 2) Move u1 to Ward B
    rr = makeReqRes({ params: { id: "wardB" }, body: { staffUserIds: ["u1"] } });
    await controller.setStaff(rr.req, rr.res);
    expect(rr.res.statusCode).to.equal(200);

    // Expectations for second call
    // a) Unassign u1 anywhere again
    expect(destroyStaffStub.firstCall.args[0]).to.deep.equal({ where: { user_id: ["u1"] } });
    // b) Remove others from wardB not in list
    const fourthArgs = destroyStaffStub.secondCall.args[0];
    expect(fourthArgs.where).to.include({ ward_id: "wardB" });
    expect(fourthArgs.where.user_id).to.have.property(Op.notIn);
    expect(fourthArgs.where.user_id[Op.notIn]).to.deep.equal(["u1"]);
    // c) Create assignment for (wardB, u1) only (no duplicates remain in wardA)
    expect(bulkCreateStaffStub.firstCall.args[0]).to.deep.equal([{ ward_id: "wardB", user_id: "u1" }]);
    expect(bulkCreateStaffStub.firstCall.args[1]).to.include({ ignoreDuplicates: true });
  });
});
