const httpMocks = require("node-mocks-http");
const { expect } = require("chai");
const sinon = require("sinon");

const controller = require("../controllers/TestCrudController");
//Test just as an example
describe("TestCrudController unit", () => {
  it("create() -> 422 when invalid body", async () => {
    //Build mock request and response
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/testcrud",
      body: { description: "missing title" }
    });
    const res = httpMocks.createResponse();
    //Call the controller function
    await controller.create(req, res);
    const data = res._getJSONData();
    //Check results, it should be false, because the title is missing
    expect(res.statusCode).to.equal(422);
    expect(data.success).to.equal(false);
  });
});
