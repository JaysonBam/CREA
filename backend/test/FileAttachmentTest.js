const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");
const { FileAttachment, IssueReport, User } = require("../models");
const controller = require("../controllers/FileAttachmentController");
const fs = require("fs");
const path = require("path");

describe("FileAttachmentController", () => {
  let findOneIssueReportStub,
    bulkCreateFileAttachmentStub,
    findAllFileAttachmentStub,
    findOneFileAttachmentStub,
    destroyFileAttachmentStub,
    existsSyncStub,
    unlinkSyncStub;

  beforeEach(() => {
    findOneIssueReportStub = sinon.stub(IssueReport, "findOne");
    bulkCreateFileAttachmentStub = sinon.stub(FileAttachment, "bulkCreate");
    findAllFileAttachmentStub = sinon.stub(FileAttachment, "findAll");
    findOneFileAttachmentStub = sinon.stub(FileAttachment, "findOne");
    destroyFileAttachmentStub = sinon.stub(FileAttachment, "destroy");
    existsSyncStub = sinon.stub(fs, "existsSync");
    unlinkSyncStub = sinon.stub(fs, "unlinkSync");
  });

  afterEach(() => {
    sinon.restore();
  });

  function makeReqRes(body, files = [], params = {}) {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/file-attachments",
      body,
      files,
      params,
      user: { user_id: 1 }, // Mock authenticated user
    });
    const res = httpMocks.createResponse({
      eventEmitter: require("events").EventEmitter,
    });
    return { req, res };
  }

  describe("create", () => {
    it("should create file attachments successfully", async () => {
      const files = [
        { filename: "test1.jpg", originalname: "original1.jpg" },
      ];
      const { req, res } = makeReqRes(
        { issue_report_token: "token123", description: "A test file" },
        files
      );

      findOneIssueReportStub.resolves({ id: 1 });
      bulkCreateFileAttachmentStub.resolves([
        { id: 1, file_link: "/uploads/test1.jpg" },
      ]);

      await controller.create(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(201);
      expect(data).to.be.an("array");
      expect(findOneIssueReportStub.calledOnce).to.be.true;
      expect(bulkCreateFileAttachmentStub.calledOnce).to.be.true;
    });

    it("should return 400 if no files are uploaded", async () => {
      const { req, res } = makeReqRes({ issue_report_token: "token123" });

      await controller.create(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(400);
      expect(data.error).to.equal("No files were uploaded.");
    });

    it("should return 400 if issue_report_token is missing", async () => {
      const { req, res } = makeReqRes(
        {},
        [{ filename: "test.jpg", originalname: "test.jpg" }]
      );

      await controller.create(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(400);
      expect(data.error).to.equal("Issue report token is required.");
    });

    it("should return 404 if IssueReport not found", async () => {
      const { req, res } = makeReqRes(
        { issue_report_token: "nonexistent" },
        [{ filename: "test.jpg", originalname: "test.jpg" }]
      );

      findOneIssueReportStub.resolves(null);

      await controller.create(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(404);
      expect(data.error).to.equal("IssueReport not found.");
    });
  });

  describe("list", () => {
    it("should list all file attachments", async () => {
      findAllFileAttachmentStub.resolves([
        { id: 1, file_link: "/uploads/file1.jpg" },
      ]);
      const { req, res } = makeReqRes({});

      await controller.list(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(200);
      expect(data).to.be.an("array");
      expect(findAllFileAttachmentStub.calledOnce).to.be.true;
    });
  });

  describe("remove", () => {
    it("should delete a file attachment and its physical file", async () => {
      const fileAttachment = {
        token: "token123",
        file_link: "/uploads/testfile.txt",
        destroy: sinon.stub().resolves(),
      };
      findOneFileAttachmentStub.resolves(fileAttachment);
      existsSyncStub.returns(true);

      const { req, res } = makeReqRes({}, [], { token: "token123" });
      await controller.remove(req, res);

      expect(res.statusCode).to.equal(204);
      expect(findOneFileAttachmentStub.calledOnce).to.be.true;
      expect(existsSyncStub.calledOnce).to.be.true;
      expect(unlinkSyncStub.calledOnce).to.be.true;
      expect(fileAttachment.destroy.calledOnce).to.be.true;
    });

    it("should return 404 if file attachment not found for deletion", async () => {
      findOneFileAttachmentStub.resolves(null);
      const { req, res } = makeReqRes({}, [], { token: "nonexistent" });

      await controller.remove(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(404);
      expect(data.error).to.equal("FileAttachment not found");
    });
  });
});