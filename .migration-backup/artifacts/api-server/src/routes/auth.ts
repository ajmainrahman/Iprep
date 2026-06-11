import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
};

const signToken = (userId: number, email: string) =>
  jwt.sign({ userId, email }, JWT_SECRET(), { expiresIn: "7d" });

router.post("/auth/register", async (req, res): Promise<void> => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { name, email, password } = parsed.data;

  let existing: typeof usersTable.$inferSelect | undefined;
  try {
    [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  } catch (e: any) {
    console.error('[auth] DB error in register:', e?.message, e?.cause, JSON.stringify(e));
    res.status(500).json({ error: 'Database error: ' + (e?.cause?.message ?? e?.message ?? String(e)) });
    return;
  }
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name: name.trim(), email: email.toLowerCase(), passwordHash })
    .returning();

  const token = signToken(user.id, user.email);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const schema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  let user: typeof usersTable.$inferSelect | undefined;
  try {
    [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  } catch (e: any) {
    console.error('[auth] DB error in login:', e?.message, e?.cause, JSON.stringify(e));
    res.status(500).json({ error: 'Database error: ' + (e?.cause?.message ?? e?.message ?? String(e)) });
    return;
  }
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email });
});

export default router;
