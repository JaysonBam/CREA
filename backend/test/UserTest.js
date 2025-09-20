const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

const models = require("../models");
const { User, Resident, Ward } = models;
const controller = require("../controllers/AuthController");
const bcrypt = require("bcrypt");
const schemaMod = require("../schemas/RegisterSchema");

//For this test, I will test register defined in AuthController by testing 5 things:
//#1) Can a Resident register successfully, create a user, and then populate an associated  record in the resident table.
//#2) Can a MunicipalStaff register successfully, (ensure user is created)
//#3) Can a CommunityLeader register successfully, (ensure user is created)
//#4) Test validation (eg, email missing and should fail)
//#5) Test validation (eg, firstName missing and should fail)

describe("AuthController.register", () => {
  let findOneUserStub;
  let createUserStub;
  let findOneWardStub;
  let createResidentStub;
  let hashStub;
  let safeParseStub;

  beforeEach(() => {
    findOneUserStub = sinon.stub(User, "findOne");
    createUserStub = sinon.stub(User, "create");
    findOneWardStub = sinon.stub(Ward, "findOne");
    createResidentStub = sinon.stub(Resident, "create");

    hashStub = sinon.stub(bcrypt, "hash").resolves("hashed_pw");

    safeParseStub = sinon
      .stub(schemaMod.registerSchema, "safeParse")
      .callThrough();
  });

  afterEach(() => {
    sinon.restore();
  });

  function makeReqRes(body) {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/auth/register",
      body,
    });
    const res = httpMocks.createResponse({
      eventEmitter: require("events").EventEmitter,
    });
    return { req, res };
  }
  //#1 (Test 1)
  it("registers a RESIDENT successfully and creates a Resident profile", async () => {
    findOneUserStub.resolves(null);

    findOneWardStub.resolves({ id: "ward-uuid-W1", code: "W1" });

    createUserStub.resolves({
      id: 101,
      first_name: "Jayden",
      role: "resident",
    });

    createResidentStub.resolves({
      id: 555,
      user_id: 101,
      ward_id: "ward-uuid-W1",
    });

    const { req, res } = makeReqRes({
      email: "resident@example.com",
      phone: "0123456789",
      password: "password123",
      firstName: "Jayden",
      lastName: "Bailie",
      role: "resident",
      address: "123 Example Street",
      ward_code: "W1",
    });

    await controller.register(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(201);
    expect(data.success).to.equal(true);
    expect(findOneUserStub.calledOnce).to.equal(true);
    expect(createUserStub.calledOnce).to.equal(true);
    expect(findOneWardStub.calledOnce).to.equal(true);
    expect(createResidentStub.calledOnce).to.equal(true);
  });

  //#2 (Test 2)
  it("registers a STAFF successfully (no ward/profile creation at signup)", async () => {
    findOneUserStub.resolves(null);
    createUserStub.resolves({ id: 102, first_name: "Staffy", role: "staff" });

    const { req, res } = makeReqRes({
      email: "staff@example.com",
      phone: "0123456789",
      password: "password123",
      firstName: "Staffy",
      lastName: "McWorker",
      role: "staff",
    });

    await controller.register(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(201);
    expect(data.success).to.equal(true);
    expect(findOneUserStub.calledOnce).to.equal(true);
    expect(createUserStub.calledOnce).to.equal(true);

    // Should NOT touch ward/resident for staff signup
    expect(findOneWardStub.called).to.equal(false);
    expect(createResidentStub.called).to.equal(false);
  });

  //#3 (Test 3)
  it("registers a COMMUNITY LEADER successfully (no ward/profile creation at signup)", async () => {
    findOneUserStub.resolves(null);
    createUserStub.resolves({
      id: 103,
      first_name: "Leader",
      role: "communityleader",
    });

    const { req, res } = makeReqRes({
      email: "leader@example.com",
      phone: "0123456789",
      password: "password123",
      firstName: "Leader",
      lastName: "Person",
      role: "communityleader",
    });

    await controller.register(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(201);
    expect(data.success).to.equal(true);
    expect(findOneUserStub.calledOnce).to.equal(true);
    expect(createUserStub.calledOnce).to.equal(true);
    expect(findOneWardStub.called).to.equal(false);
    expect(createResidentStub.called).to.equal(false);
  });

  //#4 (Test 4)
  it("returns 400 when email is missing", async () => {
    safeParseStub.callsFake((body) => ({ success: true, data: body }));

    const { req, res } = makeReqRes({
      // email missing
      phone: "0123456789",
      password: "password123",
      firstName: "NoEmail",
      lastName: "User",
      role: "resident",
      address: "123",
      ward_code: "W1",
    });

    await controller.register(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(400);
    expect(data.error).to.equal("All fields are required");
  });

  //#5 (Test 5)
  it("returns 400 when firstName is missing", async () => {
    safeParseStub.callsFake((body) => ({ success: true, data: body }));

    const { req, res } = makeReqRes({
      email: "missing.first@example.com",
      phone: "0123456789",
      password: "password123",
      // firstName missing
      lastName: "User",
      role: "resident",
      address: "123",
      ward_code: "W1",
    });

    await controller.register(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(400);
    expect(data.error).to.equal("All fields are required");
  });
});
