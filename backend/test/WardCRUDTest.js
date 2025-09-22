const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

const models = require("../models");
const { Ward } = models;

const controller = require("../controllers/WardController");

function pickMethod(controller, names) {
  for (const n of names) {
    if (typeof controller[n] === 'function') return controller[n];
  }
  return null;
}

function resolveMethod(controller, primaryNames, fallbackRegexes) {
  const picked = pickMethod(controller, primaryNames);
  if (picked) return picked;
  // fallback: try to find any function whose key matches
  const entries = Object.entries(controller).filter(([, v]) => typeof v === 'function');
  for (const [key, fn] of entries) {
    if (fallbackRegexes.some(rx => rx.test(key))) return fn;
  }
  // If controller is a class instance with prototype methods
  const proto = Object.getPrototypeOf(controller) || {};
  const protoEntries = Object.getOwnPropertyNames(proto)
    .filter(k => typeof controller[k] === 'function' && k !== 'constructor')
    .map(k => [k, controller[k]]);
  for (const [key, fn] of protoEntries) {
    if (fallbackRegexes.some(rx => rx.test(key))) return fn;
  }
  throw new TypeError(`${primaryNames.join('/')} not found on WardController`);
}

const indexFn = resolveMethod(
  controller,
  ["index", "list", "getAll", "getAllWards", "readAll", "listWards", "getWards"],
  [/index/i, /list/i, /getall/i, /wards/i]
);

const createFn = resolveMethod(
  controller,
  ["create", "store", "add", "post", "createWard"],
  [/create/i, /add/i, /post/i]
);

const updateFn = resolveMethod(
  controller,
  ["update", "put", "edit", "modify", "updateWard"],
  [/update/i, /edit/i, /modify/i, /put/i]
);

const removeFn = resolveMethod(
  controller,
  ["remove", "destroy", "delete", "del", "deleteWard"],
  [/remov/i, /destroy/i, /del/i]
);

// Endpoints:
//  - index   => list all wards
//  - show    => get one ward by :id
//  - create  => create a ward
//  - update  => update a ward by :id
//  - remove  => delete a ward by :id

function makeReqRes({ method = "GET", url = "/api/wards", body = {}, params = {} } = {}) {
  const req = httpMocks.createRequest({ method, url, body, params });
  const res = httpMocks.createResponse({ eventEmitter: require("events").EventEmitter });
  return { req, res };
}

describe("WardController CRUD", () => {
  let findAllStub, findByPkStub, createStub;

  afterEach(() => {
    sinon.restore();
  });

  // LIST
  it("lists wards (index) and returns minimal fields", async () => {
    findAllStub = sinon.stub(Ward, "findAll").resolves([
      { id: "w1", name: "Ward 1", code: "W1" },
      { id: "w2", name: "Ward 2", code: "W2" },
    ]);

    const { req, res } = makeReqRes({ method: "GET", url: "/api/wards" });
    await indexFn(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(200);
    expect(findAllStub.calledOnce).to.equal(true);

    const payload = Array.isArray(data) ? data : (data?.data || data?.wards || data?.results || []);
    expect(payload).to.be.an("array");
    if (payload[0]) {
      expect(payload[0]).to.include.keys(["id", "name"]);
    
      if (Object.prototype.hasOwnProperty.call(payload[0], 'code')) {
        expect(payload[0].code).to.be.a('string');
      }
      expect(Object.keys(payload[0])).to.not.include("token");
      expect(Object.keys(payload[0])).to.not.include("autoinc");
    }
  });

  // CREATE (POST /api/wards)
  it("creates a ward (create)", async () => {
    createStub = sinon.stub(Ward, "create").resolves({ id: "w3", name: "Ward 3", code: "W3" });

    const { req, res } = makeReqRes({ method: "POST", url: "/api/wards", body: { name: "Ward 3", code: "W3" } });
    await createFn(req, res);
    const code = res.statusCode;
    const data = res._getJSONData();

    if (code === 200 || code === 201) {
      expect(createStub.calledOnce).to.equal(true);
      const args = createStub.getCall(0).args[0];
      expect(args).to.include({ name: "Ward 3", code: "W3" });
      const payload = data?.data || data?.ward || data || {};
      expect(payload).to.have.property("id");
      expect(payload.name).to.equal("Ward 3");
    
      if (Object.prototype.hasOwnProperty.call(payload, 'code')) {
        expect(payload.code).to.equal("W3");
      }
    } else if (code === 400) {
      expect(createStub.called).to.equal(false);
    } else {
      throw new Error(`Unexpected status code for create: ${code}`);
    }
  });

  it("returns 400 on create when name missing", async () => {
    const { req, res } = makeReqRes({ method: "POST", url: "/api/wards", body: {} });
    await createFn(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(400);
  });

  // UPDATE
  it("updates a ward name (update)", async () => {
    const updateFnStub = sinon.stub().resolves({ id: "w1", name: "Ward 1 Updated" });
    findByPkStub = sinon.stub(Ward, "findByPk").resolves({ id: "w1", name: "Ward 1", update: updateFnStub });

    const { req, res } = makeReqRes({ method: "PUT", url: "/api/wards/w1", params: { id: "w1" }, body: { name: "Ward 1 Updated" } });
    await updateFn(req, res);

    expect(findByPkStub.calledOnceWith("w1")).to.equal(true);
    expect(updateFnStub.calledOnceWith({ name: "Ward 1 Updated" })).to.equal(true);
    expect(res.statusCode).to.equal(200);
  });

  it("returns 404 on update when ward not found", async () => {
    findByPkStub = sinon.stub(Ward, "findByPk").resolves(null);

    const { req, res } = makeReqRes({ method: "PUT", url: "/api/wards/none", params: { id: "none" }, body: { name: "X" } });
    await updateFn(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(404);
  });

  // DELETE
  it("deletes a ward (remove)", async () => {
    const destroyFn = sinon.stub().resolves(1);
    findByPkStub = sinon.stub(Ward, "findByPk").resolves({ id: "w2", name: "Ward 2", destroy: destroyFn });

    const { req, res } = makeReqRes({ method: "DELETE", url: "/api/wards/w2", params: { id: "w2" } });
    await removeFn(req, res);

    expect(res.statusCode).to.equal(200);
    expect(destroyFn.calledOnce).to.equal(true);
  });

  it("returns 404 on delete when ward not found", async () => {
    findByPkStub = sinon.stub(Ward, "findByPk").resolves(null);

    const { req, res } = makeReqRes({ method: "DELETE", url: "/api/wards/none", params: { id: "none" } });
    await removeFn(req, res);
    const data = res._getJSONData();

    expect(res.statusCode).to.equal(404);
  });
});
