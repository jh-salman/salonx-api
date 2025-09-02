import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { verifyJwt } from "./jwt.js";

export const Roles = {
  Owner: "owner",
  Admin: "admin",
  Staff: "staff",
  Unassigned: "unassigned"
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  if (!allowed.length) return true;
  return allowed.includes(userRole);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) return next(createError(401, "Unauthorized"));
  try {
    const token = hdr.slice(7);
    const payload = verifyJwt(token);
    (req as any).user = { id: payload.sub, role: payload.role, tenantId: payload.tenantId ?? null };
    next();
  } catch {
    next(createError(401, "Unauthorized"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user as { role?: Role } | undefined;
    if (!user?.role || !roles.includes(user.role)) return next(createError(403, "Forbidden"));
    next();
  };
}
