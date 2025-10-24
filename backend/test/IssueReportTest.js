const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

const {
  IssueReport,
  User,
  Ward,
  ReportIssueWatchlist,
  Location,
} = require("../models");
const controller = require("../controllers/IssueReportController");
const issueReportSchema = require("../schemas/issueReportSchema");
const emailService = require("../services/emailService");
const emailRenderer = require("../services/emailRenderer");

describe("IssueReportController", () => {
  // --- FIX: All stub variables are declared here ---
  let findOneIssueReportStub,
    findAllIssueReportStub,
    createIssueReportStub,
    findOneUserStub,
    findOneWardStub,
    sendEmailStub,
    renderEmailStub,
    findAllWatchlistStub,
    findByPkUserStub;

  beforeEach(() => {
    findOneIssueReportStub = sinon.stub(IssueReport, "findOne");
    findAllIssueReportStub = sinon.stub(IssueReport, "findAll");
    createIssueReportStub = sinon.stub(IssueReport, "create");
    findOneUserStub = sinon.stub(User, "findOne");
    findOneWardStub = sinon.stub(Ward, "findOne");
    sendEmailStub = sinon.stub(emailService, "sendEmailAsync").resolves();
    renderEmailStub = sinon
      .stub(emailRenderer, "renderIssueLeaderEmail")
      .resolves("<html></html>");
      
    // --- FIX: Stubs are assigned a value here ---
    findAllWatchlistStub = sinon.stub(ReportIssueWatchlist, "findAll").resolves([]);
    findByPkUserStub = sinon.stub(User, "findByPk").resolves(null);
  });

  afterEach(() => {
    sinon.restore();
  });

  function makeReqRes(body = {}, query = {}, params = {}) {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/issue-reports",
      body,
      query,
      params,
    });
    const res = httpMocks.createResponse({
      eventEmitter: require("events").EventEmitter,
    });
    return { req, res };
  }

  describe("list", () => {
    it("should list all issue reports", async () => {
      const mockReport = {
        title: "Pothole",
        get: () => mockReport,
      };
      findAllIssueReportStub.resolves([mockReport]);
      const { req, res } = makeReqRes();

      await controller.list(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(200);
      expect(data).to.be.an("array");
      expect(findAllIssueReportStub.calledOnce).to.be.true;
    });

    it("should filter by status", async () => {
      findAllIssueReportStub.resolves([]);
      const { req, res } = makeReqRes({}, { status: "NEW" });

      await controller.list(req, res);

      expect(res.statusCode).to.equal(200);
      expect(findAllIssueReportStub.args[0][0].where.status).to.equal("NEW");
    });
  });

  describe("getOne", () => {
    it("should get a single issue report by token", async () => {
      findOneIssueReportStub.resolves({ token: "token123", title: "Pothole" });
      const { req, res } = makeReqRes({}, {}, { token: "token123" });
      await controller.getOne(req, res);
      const data = res._getJSONData();
      expect(res.statusCode).to.equal(200);
      expect(data.title).to.equal("Pothole");
    });

    it("should return 404 if issue report not found", async () => {
      findOneIssueReportStub.resolves(null);
      const { req, res } = makeReqRes({}, {}, { token: "nonexistent" });
      await controller.getOne(req, res);
      const data = res._getJSONData();
      expect(res.statusCode).to.equal(404);
      expect(data.error).to.equal("Not found");
    });
  });

  describe("create", () => {
    it("should create a new issue report successfully", async () => {
        const body = {
        user_id: 1,
        title: "Big Pothole",
        description: "A very big pothole",
        category: "POTHOLE",
        ward_code: "W1",
        };
        sinon.stub(issueReportSchema, "parse").returns(body);
        findOneWardStub.resolves({ id: 10 });
        createIssueReportStub.resolves({
        id: 100,
        createdAt: new Date(),
        ...body,
        });
        
        // --- FIX: Reconfigure the existing stub instead of creating a new one ---
        findByPkUserStub.resolves({
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        });

        sinon.stub(Ward, "scope").returns({
        findByPk: sinon.stub().resolves({
            leader: { User: { email: "leader@example.com" } },
        }),
        });
        sinon.stub(Location, "findByPk").resolves(null);

        const { req, res } = makeReqRes(body);
        await controller.create(req, res);
        const data = res._getJSONData();

        expect(res.statusCode).to.equal(201);
        expect(data.title).to.equal("Big Pothole");
        expect(createIssueReportStub.calledOnce).to.be.true;
    });

    it("should return 400 for invalid data", async () => {
        const { req, res } = makeReqRes({ title: "Only Title" });
        await controller.create(req, res);
        const data = res._getJSONData();
        expect(res.statusCode).to.equal(400);
        expect(data.errors).to.exist;
    });

    it("should return 400 if ward does not exist", async () => {
        const body = {
        user_id: 1,
        title: "Test",
        description: "Test desc",
        category: "OTHER",
        ward_code: "nonexistent",
        };
        sinon.stub(issueReportSchema, "parse").returns(body);
        findOneWardStub.resolves(null);
        const { req, res } = makeReqRes(body);
        await controller.create(req, res);
        const data = res._getJSONData();
        expect(res.statusCode).to.equal(400);
        expect(data.errors.ward_code).to.exist;
    });
    });

  describe("updateStatus", () => {
    it("should update the status of an issue report", async () => {
      const issueReport = {
        id: 1,
        user_id: 2,
        token: "token123",
        status: "NEW",
        update: sinon.stub().resolves(),
      };
      findOneIssueReportStub.resolves(issueReport);
      const { req, res } = makeReqRes({ status: "ACKNOWLEDGED" }, {}, { token: "token123" });

      await controller.updateStatus(req, res);

      expect(res.statusCode).to.equal(200);
      expect(issueReport.update.calledOnceWith({ status: "ACKNOWLEDGED" })).to.be.true;
      expect(findAllWatchlistStub.calledOnce).to.be.true;
    });
  });
});