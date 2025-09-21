const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

const models = require("../models");
const { Message, IssueReport, User } = models;
const controller = require("../controllers/MessageController");

// Helper to build req/res with auth
function makeReqRes(method, url, { params = {}, body = {}, user = { user_id: 1 } } = {}) {
  const req = httpMocks.createRequest({ method, url, params, body });
  req.user = user; // JWT middleware adds this; we stub it for unit tests
  const res = httpMocks.createResponse({ eventEmitter: require("events").EventEmitter });
  return { req, res };
}

function dump(title, obj) {
  try {
    console.log(title + ":\n" + JSON.stringify(obj, null, 2));
  } catch (e) {
    console.log(title + ":", obj);
  }
}

describe("MessageController.createForIssue", () => {
  let findIssueStub;
  let findUserStub;
  let createMsgStub;
  let findMsgByPkStub;

  beforeEach(() => {
    findIssueStub = sinon.stub(IssueReport, "findOne");
    findUserStub = sinon.stub(User, "findByPk");
    createMsgStub = sinon.stub(Message, "create");
    findMsgByPkStub = sinon.stub(Message, "findByPk");
  });

  afterEach(() => sinon.restore());

  it("(Test 26) creates message with non-empty content and returns 201 (and is unread for other users)", async () => {
    const token = "issue-token-123";
    const issue = { id: 55, token };
    const user = { id: 1, role: "resident" };
    const created = { id: 999, issue_report_id: issue.id, user_id: user.id, content: "Hello" };
    const withAuthor = { id: 999, content: "Hello", author: { token: "user-token", role: "resident" }, createdAt: new Date() };

    findIssueStub.resolves(issue);
    findUserStub.resolves(user);
    createMsgStub.resolves(created);
    findMsgByPkStub.resolves(withAuthor);

    const { req, res } = makeReqRes("POST", `/api/issue-reports/${token}/messages`, {
      params: { token },
      body: { content: "Hello" },
    });

  dump("[Test 26] INPUT createForIssue", { method: req.method, url: req.url, params: req.params, body: req.body, user: req.user });
  await controller.createForIssue(req, res);
    const data = res._getJSONData();
  dump("[Test 26] OUTPUT createForIssue", { status: res.statusCode, body: data });

    expect(res.statusCode).to.equal(201);
    expect(createMsgStub.calledOnce).to.equal(true);
    expect(data).to.have.property("content", "Hello");
    expect(data).to.have.property("author");
    expect(data).to.have.property("createdAt");

    // Verify it's considered unread for a different user via unreadCounts endpoint
    const unreadReq = httpMocks.createRequest({
      method: "GET",
      url: `/api/issue-reports/unread?tokens=${token}`,
      query: { tokens: token },
    });
    unreadReq.user = { user_id: 2 }; // different user should see 1 unread
    const unreadRes = httpMocks.createResponse({ eventEmitter: require("events").EventEmitter });

    // Stub dependencies used by unreadCounts
    const findAllIssuesStub = sinon.stub(models.IssueReport, "findAll").resolves([issue]);
    const findAllReadsStub = sinon.stub(models.IssueChatRead, "findAll").resolves([]);
    const countStub = sinon.stub(models.Message, "count").resolves(1);

  dump("[Test 26] INPUT unreadCounts", { method: unreadReq.method, url: unreadReq.url, query: unreadReq.query, user: unreadReq.user });
  await controller.unreadCounts(unreadReq, unreadRes);
    const unreadData = unreadRes._getJSONData();
  dump("[Test 26] OUTPUT unreadCounts", { status: unreadRes.statusCode, body: unreadData });
    expect(unreadRes.statusCode).to.equal(200);
    expect(unreadData).to.have.property("counts");
    expect(unreadData.counts[token]).to.equal(1);

    // cleanup the additional stubs
    findAllIssuesStub.restore();
    findAllReadsStub.restore();
    countStub.restore();
  });

  it("(Test 27) rejects empty content with 400", async () => {
    const token = "issue-token-123";
    const issue = { id: 55, token };

    findIssueStub.resolves(issue);
    findUserStub.resolves({ id: 1, role: "resident" });

    const { req, res } = makeReqRes("POST", `/api/issue-reports/${token}/messages`, {
      params: { token },
      body: { content: " " }, // empty after trim
    });

  dump("[Test 27] INPUT createForIssue", { method: req.method, url: req.url, params: req.params, body: req.body, user: req.user });
  await controller.createForIssue(req, res);
    const data = res._getJSONData();
  dump("[Test 27] OUTPUT createForIssue", { status: res.statusCode, body: data });

    expect(res.statusCode).to.equal(400);
    expect(data.error).to.match(/content is required/i);
    expect(Message.create.called).to.not.equal(true);
  });
});

describe("MessageController.listForIssue (thread add)", () => {
  let findIssueStub;
  let findAllMsgsStub;

  beforeEach(() => {
    findIssueStub = sinon.stub(IssueReport, "findOne");
    findAllMsgsStub = sinon.stub(Message, "findAll");
  });

  afterEach(() => sinon.restore());

  it("(Test 28) adding a valid message appears in thread list and links to issue (non-empty content)", async () => {
    const token = "issue-token-abc";
    const issue = { id: 77, token };
    findIssueStub.resolves(issue);
    findAllMsgsStub.resolves([
      { id: 1, issue_report_id: issue.id, content: "First valid message" },
      { id: 2, issue_report_id: issue.id, content: "Second valid message" },
    ]);

    const { req, res } = makeReqRes("GET", `/api/issue-reports/${token}/messages`, { params: { token } });
  dump("[Test 28] INPUT listForIssue", { method: req.method, url: req.url, params: req.params });
  await controller.listForIssue(req, res);
    const data = res._getJSONData();
  dump("[Test 28] OUTPUT listForIssue", { status: res.statusCode, body: data });

    expect(res.statusCode).to.equal(200);
    expect(Array.isArray(data)).to.equal(true);
    expect(data.length).to.equal(2);
    expect(data.every((m) => m.issue_report_id === issue.id)).to.equal(true);
    // Ensure messages are valid (non-empty content)
    expect(data.every((m) => typeof m.content === "string" && m.content.trim().length > 0)).to.equal(true);
  });
});

describe("MessageController.createForIssue with closed thread rule", () => {
  let findIssueStub;
  let findUserStub;

  beforeEach(() => {
    findIssueStub = sinon.stub(IssueReport, "findOne");
    findUserStub = sinon.stub(User, "findByPk");
  });

  afterEach(() => sinon.restore());

  it("(Test 29) rejects adding message when issue is closed (status RESOLVED)", async () => {
    const token = "issue-token-closed";
    const issue = { id: 88, token, status: "RESOLVED" };
    findIssueStub.resolves(issue);
    findUserStub.resolves({ id: 1, role: "resident" });

    const { req, res } = makeReqRes("POST", `/api/issue-reports/${token}/messages`, {
      params: { token },
      body: { content: "This should be rejected" },
    });

  dump("[Test 29] INPUT createForIssue", { method: req.method, url: req.url, params: req.params, body: req.body, user: req.user });
  await controller.createForIssue(req, res);
    const data = res._getJSONData();
  dump("[Test 29] OUTPUT createForIssue", { status: res.statusCode, body: data });
    expect(res.statusCode).to.be.oneOf([400, 409, 423, 403]);
    expect(String(data.error || "")).to.match(/closed|resolved|not allowed/i);
  });
});
