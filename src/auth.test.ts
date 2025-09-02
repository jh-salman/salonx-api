import request from "supertest";
import app from "./server.js";
import { signJwt } from "./auth/jwt.js";

describe("auth/rbac", () => {
  it("public health works", async () => {
    await request(app).get("/health").expect(200);
    await request(app).get("/v1/health").expect(200);
  });

  it("requires auth on /v1/me", async () => {
    await request(app).get("/v1/me").expect(401);
  });

  it("accepts valid token on /v1/me", async () => {
    const token = signJwt({ sub: "u1", role: "staff" });
    const res = await request(app).get("/v1/me").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.user.id).toBe("u1");
    expect(res.body.user.role).toBe("staff");
  });

  it("rbac denies non-admin to /v1/ops/ping", async () => {
    const token = signJwt({ sub: "u2", role: "staff" });
    await request(app).get("/v1/ops/ping").set("Authorization", `Bearer ${token}`).expect(403);
  });

  it("rbac allows admin to /v1/ops/ping", async () => {
    const token = signJwt({ sub: "u3", role: "admin" });
    await request(app).get("/v1/ops/ping").set("Authorization", `Bearer ${token}`).expect(200);
  });
});
