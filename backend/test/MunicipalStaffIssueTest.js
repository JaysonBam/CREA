const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");
let fakeModels;

beforeEach(() => {
  fakeModels = {
    Op: {},

    IssueReport: {
      findOne: sinon.stub(),
    },

    MunicipalStaff: {
      findAll: sinon.stub(),
      findOne: sinon.stub(),
    },

    MunicipalStaffIssueReport: {
      findAll: sinon.stub(),
      findOne: sinon.stub(),
      create: sinon.stub(),
      findByPk: sinon.stub(),
      destroy: sinon.stub(),
    },

    User: {},
    Ward: {}, 
  };

  require.cache[require.resolve("../models")] = { exports: fakeModels };
});

function loadController() {
  const path = "../controllers/MunicipalStaffIssueReportController";
  delete require.cache[require.resolve(path)];
  return require(path);
}

describe("MunicipalStaffIssueReportController", () => {
  describe("listForIssue()", () => {
    it("200 returns assignments for an issue", async () => {
      fakeModels.IssueReport.findOne.resolves({
        id: 1, token: "issueTok", ward_id: 9,
        ward: { id: 9, name: "W1", code: "W-1" },
      });

      const rows = [{ id: 10 }, { id: 11 }];
      fakeModels.MunicipalStaffIssueReport.findAll.resolves(rows);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "GET",
        params: { issueToken: "issueTok" },
      });
      const res = httpMocks.createResponse();
      const next = sinon.stub();

      await controller.listForIssue(req, res, next);

      expect(next.called).to.be.false;
      expect(res.statusCode).to.equal(200);
      expect(res._getJSONData()).to.deep.equal(rows);
    });

    it("404 when issue not found", async () => {
      fakeModels.IssueReport.findOne.resolves(null);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "GET",
        params: { issueToken: "bad" },
      });
      const res = httpMocks.createResponse();

      await controller.listForIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Issue not found" });
    });
  });

  describe("listEligibleStaffForIssue()", () => {
    it("200 returns staff in same ward", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1, ward_id: 5 });

      const staff = [{ id: 1 }, { id: 2 }];
      fakeModels.MunicipalStaff.findAll.resolves(staff);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "GET",
        params: { issueToken: "tok" },
      });
      const res = httpMocks.createResponse();

      await controller.listEligibleStaffForIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(200);
      expect(res._getJSONData()).to.deep.equal(staff);
    });

    it("404 when issue not found", async () => {
      fakeModels.IssueReport.findOne.resolves(null);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "GET",
        params: { issueToken: "missing" },
      });
      const res = httpMocks.createResponse();

      await controller.listEligibleStaffForIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Issue not found" });
    });
  });

  describe("addToIssue()", () => {
    it("400 when municipalStaffToken missing", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1, ward_id: 2 });

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "POST",
        params: { issueToken: "tok" },
        body: {}, // no municipalStaffToken
      });
      const res = httpMocks.createResponse();

      await controller.addToIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(400);
      expect(res._getJSONData()).to.deep.equal({ error: "municipalStaffToken is required" });
    });

    it("404 when staff not found", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1, ward_id: 2 });
      fakeModels.MunicipalStaff.findOne.resolves(null);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "POST",
        params: { issueToken: "tok" },
        body: { municipalStaffToken: "x" },
      });
      const res = httpMocks.createResponse();

      await controller.addToIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Staff not found" });
    });

    it("400 when staff ward != issue ward", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1, ward_id: 2 });
      fakeModels.MunicipalStaff.findOne.resolves({ id: 9, ward_id: 3 });

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "POST",
        params: { issueToken: "tok" },
        body: { municipalStaffToken: "s1" },
      });
      const res = httpMocks.createResponse();

      await controller.addToIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(400);
      expect(res._getJSONData()).to.deep.equal({ error: "Staff must belong to the issue's ward" });
    });

    it("200 when assignment already exists (idempotent)", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1, ward_id: 5 });
      fakeModels.MunicipalStaff.findOne.resolves({ id: 9, ward_id: 5 });
      const existing = { id: 123, token: "aa" };
      fakeModels.MunicipalStaffIssueReport.findOne.resolves(existing);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "POST",
        params: { issueToken: "tok" },
        body: { municipalStaffToken: "s1", note: "hello" },
      });
      const res = httpMocks.createResponse();

      await controller.addToIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(200);
      expect(res._getJSONData()).to.deep.equal(existing);
    });

    it("201 when created", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1, ward_id: 5 });
      fakeModels.MunicipalStaff.findOne.resolves({ id: 9, ward_id: 5 });
      fakeModels.MunicipalStaffIssueReport.findOne.resolves(null); // not existing
      const created = { id: 55 };
      fakeModels.MunicipalStaffIssueReport.create.resolves(created);

      const withInclude = { id: 55, token: "tok-assign" };
      fakeModels.MunicipalStaffIssueReport.findByPk.resolves(withInclude);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "POST",
        params: { issueToken: "tok" },
        body: { municipalStaffToken: "s1", note: "hey" },
      });
      const res = httpMocks.createResponse();

      await controller.addToIssue(req, res, sinon.stub());

      expect(res.statusCode).to.equal(201);
      expect(res._getJSONData()).to.deep.equal(withInclude);
    });
  });

  describe("updateAssignment()", () => {
    it("404 when assignment not found", async () => {
      fakeModels.MunicipalStaffIssueReport.findOne.resolves(null);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "PATCH",
        params: { msirToken: "bad" },
        body: { note: "x" },
      });
      const res = httpMocks.createResponse();

      await controller.updateAssignment(req, res, sinon.stub());

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Assignment not found" });
    });

    it("200 when updated", async () => {
      const row = { id: 1, token: "t1", update: sinon.stub().resolves() };
      fakeModels.MunicipalStaffIssueReport.findOne.resolves(row);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "PATCH",
        params: { msirToken: "t1" },
        body: { note: "updated" },
      });
      const res = httpMocks.createResponse();

      await controller.updateAssignment(req, res, sinon.stub());

      expect(res.statusCode).to.equal(200);
      expect(row.update.calledOnce).to.be.true;
      const data = res._getJSONData();
      expect(data.id).to.equal(1);
      expect(data.token).to.equal("t1");
    });
  });

  describe("removeAssignment()", () => {
    it("404 when not found", async () => {
      fakeModels.MunicipalStaffIssueReport.findOne.resolves(null);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "DELETE",
        params: { msirToken: "nope" },
      });
      const res = httpMocks.createResponse();

      await controller.removeAssignment(req, res, sinon.stub());

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Assignment not found" });
    });

    it("204 when deleted", async () => {
      const row = { id: 7, destroy: sinon.stub().resolves() };
      fakeModels.MunicipalStaffIssueReport.findOne.resolves(row);

      const controller = loadController();
      const req = httpMocks.createRequest({
        method: "DELETE",
        params: { msirToken: "ok" },
      });
      const res = httpMocks.createResponse();

      await controller.removeAssignment(req, res, sinon.stub());

      expect(res.statusCode).to.equal(204);
      // No body expected
      expect(res._isEndCalled()).to.be.true;
    });
  });
});
