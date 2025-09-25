// test/MaintenanceScheduleTest.js
const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

// Fake Sequelize models (will be reset before each test)
let fakeModels;

// Replace "../models" before requiring the controller
beforeEach(() => {
  fakeModels = {
    MaintenanceSchedule: {
      findAll: sinon.stub(),
      findOne: sinon.stub(),
      create: sinon.stub(),
      destroy: sinon.stub(),
    },
    IssueReport: {
      findOne: sinon.stub(),
    },
  };
  require.cache[require.resolve("../models")] = { exports: fakeModels };
});

// Require fresh controller after models replaced
function loadController() {
  delete require.cache[require.resolve("../controllers/MaintenanceScheduleController")];
  return require("../controllers/MaintenanceScheduleController");
}

describe("MaintenanceScheduleController", () => {
//Testing list method
  describe("list()", () => {
    //Testing to see if all rows are returned
    it("returns all rows (200)", async () => {
      const rows = [{ id: 1 }];
      fakeModels.MaintenanceSchedule.findAll.resolves(rows);
      const controller = loadController();

      const req = httpMocks.createRequest({ method: "GET" });
      const res = httpMocks.createResponse();

      await controller.list(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res._getJSONData()).to.deep.equal(rows);
    });

    it("404 when issueToken not found", async () => {
        //Should fail when issueToken not found
      fakeModels.IssueReport.findOne.resolves(null);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "GET",
        query: { issueToken: "bad" },
      });
      const res = httpMocks.createResponse();

      await controller.list(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Issue not found" });
    });
  });

//Tesing the getOne method
  describe("getOne()", () => {
    //Uses token and finds the record to update
    it("200 when found", async () => {
      const row = { id: 1, token: "tok" };
      fakeModels.MaintenanceSchedule.findOne.resolves(row);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "GET",
        params: { token: "tok" },
      });
      const res = httpMocks.createResponse();

      await controller.getOne(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res._getJSONData()).to.deep.equal(row);
    });
    //Return 404 when not found (should fail)
    it("404 when not found", async () => {
      fakeModels.MaintenanceSchedule.findOne.resolves(null);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "GET",
        params: { token: "tok" },
      });
      const res = httpMocks.createResponse();

      await controller.getOne(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Not found" });
    });
  });

//Testing the create method
  describe("create()", () => {
    //Use all required fields
    const body = {
      issueToken: "iss",
      description: "Fix leak",
      date_time_from: "2025-09-20T10:00:00Z",
      date_time_to: "2025-09-20T12:00:00Z",
    };
    //Should fail if description is missing
    it("400 when description missing", async () => {
      const controller = loadController();
      const req = httpMocks.createRequest({ method: "POST", body: { ...body, description: "" } });
      const res = httpMocks.createResponse();

      await controller.create(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res._getJSONData()).to.deep.equal({ error: "description is required" });
    });
    //Should pass
    it("201 when created", async () => {
      fakeModels.IssueReport.findOne.resolves({ id: 1 });
      const created = { id: 99, description: "Fix leak" };
      fakeModels.MaintenanceSchedule.create.resolves(created);
      const controller = loadController();

      const req = httpMocks.createRequest({ method: "POST", body });
      const res = httpMocks.createResponse();

      await controller.create(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res._getJSONData()).to.deep.equal(created);
    });
  });

//Testing the update method
  describe("update()", () => {
    //Fails because it can't find record to updates
    it("404 when row not found", async () => {
      fakeModels.MaintenanceSchedule.findOne.resolves(null);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "PATCH",
        params: { token: "tok" },
        body: { description: "new" },
      });
      const res = httpMocks.createResponse();

      await controller.update(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Not found" });
    });
    //Should pass, it finds the records
    it("200 when updated", async () => {
      const row = { id: 1, token: "tok", update: sinon.stub().resolves() };
      fakeModels.MaintenanceSchedule.findOne.resolves(row);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "PATCH",
        params: { token: "tok" },
        body: { description: "updated" },
      });
      const res = httpMocks.createResponse();

      await controller.update(req, res);

      expect(res.statusCode).to.equal(200);
      const data = res._getJSONData();
      expect(data.id).to.equal(1);
      expect(data.token).to.equal("tok");
      expect(row.update.calledOnce).to.be.true;
    });
  });

//Testing the remove function
  describe("remove()", () => {
    it("404 when not found", async () => {
      fakeModels.MaintenanceSchedule.destroy.resolves(0);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "DELETE",
        params: { token: "tok" },
      });
      const res = httpMocks.createResponse();

      await controller.remove(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res._getJSONData()).to.deep.equal({ error: "Not found" });
    });

    it("200 when deleted", async () => {
      fakeModels.MaintenanceSchedule.destroy.resolves(1);
      const controller = loadController();

      const req = httpMocks.createRequest({
        method: "DELETE",
        params: { token: "tok" },
      });
      const res = httpMocks.createResponse();

      await controller.remove(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res._getJSONData()).to.deep.equal({ ok: true });
    });
  });
});
