import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const secret = () => process.env.JWT_SECRET || "local-development-change-me";
const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = <T>(value: string) =>
  JSON.parse(Buffer.from(value, "base64url").toString()) as T;

export type SessionPayload = {
  sub: string;
  role: "admin" | "reader";
  email: string;
  exp: number;
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export function createSession(payload: Omit<SessionPayload, "exp">) {
  const session: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(session);
  const signature = createHmac("sha256", secret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const expected = createHmac("sha256", secret())
    .update(`${header}.${body}`)
    .digest("base64url");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  const payload = decode<SessionPayload>(body);
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}

export async function verifyGoogleToken(idToken: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!response.ok) throw new Error("Google sign-in could not be verified");
  const profile = (await response.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: string;
  };
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    profile.aud !== process.env.GOOGLE_CLIENT_ID ||
    !profile.sub ||
    !profile.email ||
    profile.email_verified !== "true"
  )
    throw new Error("Invalid Google sign-in token");
  return {
    subject: profile.sub,
    email: profile.email.toLowerCase(),
    displayName: profile.name || profile.email.split("@")[0],
  };
}
