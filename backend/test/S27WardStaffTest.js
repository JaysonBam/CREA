
// Test Output Meaning:
//  - 200: Successful retrieval of ward details.
//  - 500: An unexpected server error occurred during listDetailed().

// These tests ensure:
//  - Wards return correct leader and staff data when associations exist.
//  - The controller handles missing/null leader/staff associations.
//  - The scope 'withPeople' is used when available, otherwise it falls back to include-path.
//  - Errors are caught and return a proper 500 with error message.

const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

// Models
const models = require("../models");
const { Ward } = models;

// Controller tested
const controller = require("../controllers/WardController");

function makeReqRes() {
  const req = httpMocks.createRequest({ method: "GET", url: "/api/wards/detailed" });
  const res = httpMocks.createResponse({ eventEmitter: require("events").EventEmitter });
  return { req, res };
}

describe("SCRUM 27 — Staff list by ward via listDetailed()", () => {
  let findAllStub;
  let scopeStub;

  afterEach(() => {
    sinon.restore();
    // Clean any properties temporarily added
    if (Ward && Ward.options) {
      // leave existing options untouched
    }
  });

  it("composes leader + staff correctly for each ward", async () => {
    // Force the non-scope path
    sinon.stub(Ward, "scope"); // undefined or stubbed 
    sinon.stub(Ward, "options").value({}); // no scopes defined
    findAllStub = sinon.stub(Ward, "findAll").resolves([
      {
        id: "w1",
        name: "Ward 1",
        code: "W1",
        // leader with nested User
        leader: {
          User: { id: "L1", first_name: "Alice", last_name: "Leader", email: "alice@example.com" },
          user_id: "L1",
        },
        // staff is an array; each has nested User
        staff: [
          { User: { id: "S1", first_name: "Bob", last_name: "Staff", email: "bob@example.com" } },
          { User: { id: "S2", first_name: "Cleo", last_name: "Staff", email: "cleo@example.com" } },
        ],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ]);

    const { req, res } = makeReqRes();
    await controller.listDetailed(req, res);

    expect(res.statusCode).to.equal(200);
    const body = res._getJSONData();
    expect(body).to.have.property("success", true);
    expect(body).to.have.property("data").that.is.an("array").with.length(1);

    const w = body.data[0];
    expect(w).to.include({
      id: "w1",
      name: "Ward 1",
      code: "W1",
      leaderId: "L1",
      leaderName: "Alice Leader",
      staffCount: 2,
    });
    expect(w).to.have.property("staffIds").that.deep.equals(["S1", "S2"]);
    expect(w).to.have.property("createdAt");
    expect(w).to.have.property("updatedAt");

    // ensure we used include-path (non-scope) and not scope().findAll()
    expect(findAllStub.calledOnce).to.equal(true);
  });

  it("falls back to robust defaults when associations are missing", async () => {
    sinon.stub(Ward, "scope");
    sinon.stub(Ward, "options").value({}); // no scopes
    findAllStub = sinon.stub(Ward, "findAll").resolves([
      {
        id: "w2",
        name: "Ward 2",
        code: "W2",
        leader: null,
        staff: null, // missing/undefined array
      },
    ]);

    const { req, res } = makeReqRes();
    await controller.listDetailed(req, res);

    expect(res.statusCode).to.equal(200);
    const { data } = res._getJSONData();
    const w = data[0];

    expect(w.leaderId).to.equal(null);
    expect(w.leaderName).to.equal(null);
    expect(w.staffIds).to.deep.equal([]);
    expect(w.staffCount).to.equal(0);
  });

  it("uses Ward.scope('withPeople').findAll() when scope is available", async () => {
    // Arrange
    const scoped = { findAll: sinon.stub().resolves([]) };

    // Simulate presence of a scope named 'withPeople'
    scopeStub = sinon.stub(Ward, "scope").callsFake((name) => {
      expect(name).to.equal("withPeople");
      return scoped;
    });
    sinon.stub(Ward, "options").value({ scopes: { withPeople: true } });

    // Also stub findAll on Ward to ensure it is NOT called on the base model
    const baseFindAll = sinon.stub(Ward, "findAll");

    const { req, res } = makeReqRes();
    await controller.listDetailed(req, res);

    expect(scopeStub.calledOnceWith("withPeople")).to.equal(true);
    expect(scoped.findAll.calledOnce).to.equal(true);
    expect(baseFindAll.called).to.equal(false);

    const body = res._getJSONData();
    expect(body).to.include({ success: true });
    expect(body.data).to.be.an("array").that.has.length(0);
  });

  it("returns 500 when an unexpected error occurs", async () => {
    sinon.stub(Ward, "scope");
    sinon.stub(Ward, "options").value({});
    findAllStub = sinon.stub(Ward, "findAll").rejects(new Error("boom"));

    const { req, res } = makeReqRes();
    await controller.listDetailed(req, res);

    expect(res.statusCode).to.equal(500);
    const body = res._getJSONData();
    expect(body).to.include({ success: false });
    expect((body.message || "").toLowerCase()).to.contain("boom");
  });
});