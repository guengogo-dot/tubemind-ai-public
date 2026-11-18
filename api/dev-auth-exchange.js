// DEV-only single-use OAuth exchange. Requires DEV_DATABASE_URL on Vercel Preview.
import { createHash, createPublicKey, verify } from "node:crypto";
import pg from "pg";

const JWKS = "https://ep-red-boat-b2at0ihs.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth/.well-known/jwks.json";
const ISSUER = "https://ep-red-boat-b2at0ihs.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth";
const TTL_MS = 60_000;
const pool = process.env.DEV_DATABASE_URL ? new pg.Pool({ connectionString: process.env.DEV_DATABASE_URL, max: 2 }) : null;

function reply(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(body);
}
async function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw Error("invalid_token_format");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  if (header.alg !== "EdDSA" || !header.kid) throw Error("invalid_token_header");
  if (!payload.sub) throw Error("invalid_token_subject");
  if (payload.iss !== ISSUER) throw Error("invalid_token_issuer");
  if (typeof payload.exp !== "number" || payload.exp <= Date.now()/1000) throw Error("invalid_token_expired");
  const response = await fetch(JWKS);
  if (!response.ok) throw Error("jwks_unavailable");
  const keys = (await response.json()).keys || [];
  const key = keys.find(k => k.kid === header.kid);
  if (!key) throw Error("invalid_token_key");
  if (!verify(null, Buffer.from(parts[0]+"."+parts[1]), createPublicKey({key,format:"jwk"}), Buffer.from(parts[2],"base64url"))) throw Error("invalid_token_signature");
  return payload;
}
export default async function handler(req, res) {
  const allowedOrigins = new Set([
    "chrome-extension://ijiihdnkpfngnnoodnnliokgklkondnj",
    "chrome-extension://gddjodeedjcpllaphchfjmfleiegncdc",
    "chrome-extension://mcfehbdphboeinbgpgbpifhaophapaog",
  ]);
  const allowedOrigin = allowedOrigins.has(req.headers.origin) ? req.headers.origin : null;
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(allowedOrigin ? 204 : 403).end();
  if (req.method !== "POST") return reply(res, 405, {error:"method_not_allowed"});
  if (!pool) return reply(res, 503, {error:"dev_database_not_configured"});
  const action = req.query?.action;
  if (action !== "issue" && action !== "redeem") return reply(res, 404, {error:"unknown_action"});
  try {
    if (action === "issue") {
      const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
      if (!match) return reply(res,401,{error:"authentication_required"});
      const payload = await verifyJwt(match[1]);
      const {randomBytes} = await import("node:crypto");
      const code = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now()+TTL_MS);
      await pool.query("INSERT INTO public.auth_exchange_codes (code_hash,user_id,access_token,expires_at) VALUES ($1,$2::uuid,$3,$4)",[createHash("sha256").update(code).digest("hex"),payload.sub,match[1],expiresAt]);
      return reply(res,200,{code,expiresAt});
    }
    const code = req.body?.code;
    if (typeof code !== "string" || !/^[A-Za-z0-9_-]{30,100}$/.test(code)) return reply(res,400,{error:"invalid_or_expired_code"});
    const result = await pool.query("UPDATE public.auth_exchange_codes SET consumed_at=NOW() WHERE code_hash=$1 AND consumed_at IS NULL AND expires_at>NOW() RETURNING access_token",[createHash("sha256").update(code).digest("hex")]);
    if (!result.rows.length) return reply(res,400,{error:"invalid_or_expired_code"});
    return reply(res,200,{accessToken:result.rows[0].access_token});
  } catch (e) {
    if (typeof e.message === "string" && e.message.startsWith("invalid_token")) {
      console.warn("DEV OAuth JWT verification failed:", e.message);
      return reply(res,401,{error:"invalid_session"});
    }
    console.error("DEV OAuth exchange failed:",e.message);
    return reply(res,500,{error:"dev_exchange_failed"});
  }
}
