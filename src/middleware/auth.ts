import type { RequestHandler } from "express";
import { verifyJwt } from "../auth/jwt.js";
import type { Role } from "../auth/rbac.js";
import { hasRole } from "../auth/rbac.js";

export const auth = (required = true): RequestHandler => (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return required ? next(Object.assign(new Error("Unauthorized"), { status: 401 })) : next();
  }
  try {
    const payload = verifyJwt(token);
    (req as any).user = { id: payload.sub, role: payload.role, tenantId: payload.tenantId ?? null };
    next();
  } catch {
    next(Object.assign(new Error("Unauthorized"), { status: 401 }));
  }
};

export const requireRoles =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    const role = (req as any).user?.role as Role | undefined;
    if (hasRole(role, allowed)) return next();
    next(Object.assign(new Error("Forbidden"), { status: 403 }));
  };
