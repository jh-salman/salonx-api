import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/index.js";
import type { Role } from "./rbac.js";
import { nanoid } from "nanoid";
import { getRedis } from "../redis/index.js";

const { sign, verify } = jwt as unknown as {
  sign: (payload: object, secret: string, options?: any) => string;
  verify: (token: string, secret: string) => any;
};

export type JwtPayload = {
  sub: string;
  role: Role;
  tenantId?: string | null;
  jti?: string;
  typ?: "access" | "refresh";
  iat?: number;
  exp?: number;
};

export function signAccessJwt(payload: { sub: string; role: Role; tenantId?: string | null }) {
  return sign({ ...payload, typ: "access" } as object, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
}

export function signRefreshJwt(payload: { sub: string; role: Role; tenantId?: string | null; jti: string }) {
  const exp = env.JWT_REFRESH_EXPIRES || "30d";
  return sign({ ...payload, typ: "refresh" } as object, env.JWT_SECRET, { expiresIn: exp as any });
}

export function verifyJwt(token: string) {
  return verify(token, env.JWT_SECRET) as JwtPayload;
}
export function signJwt(payload: { sub: string; role: Role; tenantId?: string | null }) {
  return signAccessJwt(payload);
}
export function issueAccessToken(payload: { sub: string; role: Role; tenantId?: string | null }) {
  return signAccessJwt(payload);
}



export async function issueTokenPair(payload: { sub: string; role: Role; tenantId?: string | null }) {
  const jti = nanoid(16);
  const access = signAccessJwt(payload);
  const refresh = signRefreshJwt({ ...payload, jti });
  const redis = getRedis();
  if (redis) {
    const ttl = parseTtlSeconds(env.JWT_REFRESH_EXPIRES || "30d");
    await redis.set(refreshKey(payload.sub, jti), "1", "EX", ttl);
  }
  return { access, refresh, jti };
}

export async function rotateRefreshToken(oldJti: string | undefined, payload: { sub: string; role: Role; tenantId?: string | null }) {
  const redis = getRedis();
  if (redis && oldJti) {
    await redis.del(refreshKey(payload.sub, oldJti));
  }
  return issueTokenPair(payload);
}

export async function isRefreshValid(sub: string, jti: string) {
  const redis = getRedis();
  if (!redis) return true;
  const val = await redis.get(refreshKey(sub, jti));
  return val === "1";
}

function refreshKey(sub: string, jti: string) {
  return `refresh:${sub}:${jti}`;
}

function parseTtlSeconds(inp: string) {
  const m = /^(\d+)([smhd])?$/.exec(inp);
  if (!m) return 60 * 60 * 24 * 30;
  const n = Number(m[1]);
  const unit = m[2] || "s";
  switch (unit) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 3600;
    case "d":
      return n * 86400;
    default:
      return n;
  }
}

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

export function comparePassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
