declare global {
  namespace Express {
    interface UserClaims {
      id: string;
      role?: import("./auth/rbac.js").Role;
      tenantId?: string | null;
    }
    interface Request {
      user?: UserClaims;
      tenantId?: string | null;
      cookies?: Record<string, string>;
    }
  }
}
export {};
