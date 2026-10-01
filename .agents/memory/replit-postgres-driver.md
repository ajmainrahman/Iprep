---
name: Replit PostgreSQL driver compatibility
description: Driver compatibility lesson when porting apps that used Neon to Replit PostgreSQL.
---

When an imported app originally used Neon HTTP but is pointed at Replit's standard PostgreSQL database, use Drizzle's node-postgres driver with `pg` rather than `drizzle-orm/neon-http`.

**Why:** The Neon HTTP driver returned a runtime mapping error against the Replit PostgreSQL URL even though the database tables existed and were readable through `pg`.

**How to apply:** During Vercel/Neon-to-Replit ports, retain the existing schema and data, switch only the connection driver, then verify a read-only authenticated API query before testing mutations.