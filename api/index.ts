// Vercel serverless entry for all /api/* requests. Wraps the real Express app
// (artifacts/api-server/src/app.ts), bundled by `pnpm --filter
// @workspace/api-server run build` into dist/app.mjs before Vercel packages
// this function (see buildCommand in vercel.json).
// @ts-ignore - generated build artifact, no .d.ts
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
