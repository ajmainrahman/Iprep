import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

function getDb() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("NEON_DATABASE_URL or DATABASE_URL must be set.");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export * from "./schema";
