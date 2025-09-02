import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../auth/jwt.js";

export function deserializeUser(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (hdr?.startsWith("Bearer ")) {
    try {
      const payload = verifyJwt(hdr.slice(7));
      (req as any).user = { id: payload.sub, role: payload.role, tenantId: payload.tenantId ?? null };
    } catch {
      (req as any).user = undefined;
    }
  }
  next();
}

export function bindTenant(req: Request, _res: Response, next: NextFunction) {
  const headerTenant = req.headers["x-tenant-id"];
  const tenantId = Array.isArray(headerTenant) ? headerTenant[0] : headerTenant;
  (req as any).tenantId = tenantId ?? (req as any).user?.tenantId ?? null;
  next();
}
