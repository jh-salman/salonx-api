import request from "supertest";
import app from "./server.js";

describe("health", () => {
  it("GET /v1/health returns ok", async () => {
    const res = await request(app).get("/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
