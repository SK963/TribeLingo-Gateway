import { z } from "zod";

export const TranslateSchema = z.object({
  text: z.string().min(1).max(5000),
  sourceLang: z.string().min(2).max(32).optional(),
  /** Required — forwarded as `target` to translation_v2 (Google Translate). */
  targetLang: z.string().min(2).max(32),
});

