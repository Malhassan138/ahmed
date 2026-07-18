import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "medistore_token";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, {
    expiresIn: "30d",
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function getCookieName() {
  return COOKIE_NAME;
}

// Get the logged-in user (full DB record) from the request cookies. Returns null if not logged in.
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.active) return null;
  return user;
}

export function userPermissions(user) {
  if (!user) return [];
  if (user.role === "ADMIN") return ["*"]; // admin has all permissions
  try {
    return JSON.parse(user.permissions || "[]");
  } catch {
    return [];
  }
}

export function hasPermission(user, key) {
  const perms = userPermissions(user);
  return perms.includes("*") || perms.includes(key);
}
