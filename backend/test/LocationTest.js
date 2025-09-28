const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");
const { Location, IssueReport } = require("../models");
const controller = require("../controllers/LocationController");

describe("LocationController", () => {
  let createLocationStub,
    findAllLocationStub,
    findOneLocationStub,
    destroyLocationStub;

  beforeEach(() => {
    createLocationStub = sinon.stub(Location, "create");
    findAllLocationStub = sinon.stub(Location, "findAll");
    findOneLocationStub = sinon.stub(Location, "findOne");
    // For the destroy() method on an instance
    destroyLocationStub = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  function makeReqRes(body = {}, params = {}) {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/locations",
      body,
      params,
    });
    const res = httpMocks.createResponse({
      eventEmitter: require("events").EventEmitter,
    });
    return { req, res };
  }

  describe("create", () => {
    it("should create a location successfully", async () => {
      const body = {
        address: "123 Main St",
        latitude: 45.0,
        longitude: -75.0,
      };
      createLocationStub.resolves({ id: 1, ...body });
      const { req, res } = makeReqRes(body);

      await controller.create(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(201);
      expect(data.address).to.equal("123 Main St");
      expect(createLocationStub.calledOnce).to.be.true;
    });

    it("should return 400 if latitude is missing", async () => {
      const { req, res } = makeReqRes({ longitude: -75.0 });

      await controller.create(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(400);
      expect(data.error).to.equal("Latitude and Longitude are required fields.");
    });
  });

  describe("list", () => {
    it("should list all locations", async () => {
      findAllLocationStub.resolves([{ id: 1, address: "123 Main St" }]);
      const { req, res } = makeReqRes();

      await controller.list(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(200);
      expect(data).to.be.an("array");
      expect(findAllLocationStub.calledOnce).to.be.true;
    });
  });

  describe("getOne", () => {
    it("should get a single location by token", async () => {
      findOneLocationStub.resolves({
        token: "token123",
        address: "123 Main St",
      });
      const { req, res } = makeReqRes({}, { token: "token123" });

      await controller.getOne(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(200);
      expect(data.address).to.equal("123 Main St");
    });

    it("should return 404 if location not found", async () => {
      findOneLocationStub.resolves(null);
      const { req, res } = makeReqRes({}, { token: "nonexistent" });

      await controller.getOne(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(404);
      expect(data.error).to.equal("Location not found");
    });
  });

  describe("remove", () => {
    it("should delete a location successfully", async () => {
      const locationInstance = {
        token: "token123",
        destroy: destroyLocationStub.resolves(),
      };
      findOneLocationStub.resolves(locationInstance);
      const { req, res } = makeReqRes({}, { token: "token123" });

      await controller.remove(req, res);

      expect(res.statusCode).to.equal(204);
      expect(findOneLocationStub.calledOnce).to.be.true;
      expect(destroyLocationStub.calledOnce).to.be.true;
    });

    it("should return 404 if location not found for deletion", async () => {
      findOneLocationStub.resolves(null);
      const { req, res } = makeReqRes({}, { token: "nonexistent" });

      await controller.remove(req, res);
      const data = res._getJSONData();

      expect(res.statusCode).to.equal(404);
      expect(data.error).to.equal("Location not found");
    });
  });
});