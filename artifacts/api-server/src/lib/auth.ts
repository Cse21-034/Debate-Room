import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { type Request, type Response, type NextFunction } from "express";

const JWT_SECRET =
  process.env.JWT_SECRET ?? "dev-secret-please-set-in-production";
const SALT_ROUNDS = 10;

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  avatarKey: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const hashPassword = (password: string) =>
  bcrypt.hash(password, SALT_ROUNDS);

export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signToken = (payload: AuthUser) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

export const verifyToken = (token: string): AuthUser =>
  jwt.verify(token, JWT_SECRET) as AuthUser;

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
