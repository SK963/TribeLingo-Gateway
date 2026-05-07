import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { apiRouter } from "./routes";
import { prisma } from "./modules/db/prisma";
import { redis } from "./modules/cache/redis";

const app = express();

app.use(helmet());

// Determine allowed CORS origins:
// - Development: auto-allow any localhost/127.0.0.1 origin so Vite port changes never break it.
// - Production (K8s Ingress): CORS_ORIGIN is empty → same-origin requests → allow all (true).
// - Production (explicit): comma-separated list in CORS_ORIGIN env var.
const corsOrigin = (() => {
  if (env.NODE_ENV !== "production") {
    return (origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (curl, Postman), any localhost variant, or ngrok URLs
      if (
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.includes('.ngrok') ||
        origin.includes('.ngrok-free.dev') ||
        origin.includes('.ngrok.app')
      ) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed in development`));
    };
  }
  // Production: if CORS_ORIGIN is set, use that list; otherwise allow all (same-origin via Ingress)
  return env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true;
})();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("combined"));

app.get("/healthz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // Fails fast if migrations were never applied (`User` missing) while DB is reachable.
    await prisma.user.findFirst({ select: { id: true } });
    return res.json({ ok: true });
  } catch {
    return res.status(503).json({ ok: false });
  }
});

app.use("/api", apiRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`gateway listening on :${env.PORT} (${env.NODE_ENV})`);
});

process.on("SIGTERM", async () => {
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
});

