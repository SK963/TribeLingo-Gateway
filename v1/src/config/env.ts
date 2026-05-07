import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

/** Node often resolves `localhost` to ::1 while dev servers bind only to 127.0.0.1 — outbound fetch then fails. */
function normalizeOutboundServiceUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      return u.href.replace(/\/+$/, "");
    }
  } catch {
    /* ignore */
  }
  return trimmed;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  CORS_ORIGIN: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AUTH_COOKIE_NAME: z.string().default("gateway_token"),
  AUTH_COOKIE_SECURE: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((v) => v === "true"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().optional(),
  DATA_ENCRYPTION_KEY_BASE64: z.string().optional(),

  TRANSLATION_SERVICE_URL: z.string().url().transform(normalizeOutboundServiceUrl),
  POS_SERVICE_URL: z.string().url().transform(normalizeOutboundServiceUrl),
  CHATBOT_SERVICE_URL: z.string().url().transform(normalizeOutboundServiceUrl),

  /** Kokborok (etc.) Google Translate language code — must match translation_v2 `KOKBOROK_LANGUAGE_CODE`. */
  KOKBOROK_LANGUAGE_CODE: z.string().min(2).max(32).default("trp"),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

