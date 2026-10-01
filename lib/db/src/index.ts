import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("NEON_DATABASE_URL or DATABASE_URL must be set.");
  }
  pool ??= new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

function getDb() {
  database ??= createDatabase();
  return database;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export * from "./schema";
