import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userEmail?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = auth.slice(7);
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!secret) {
      res.status(500).json({ error: "Authentication is not configured." });
      return;
    }
    const decoded = jwt.verify(token, secret) as { userId: number; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}
