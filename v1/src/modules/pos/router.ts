import { Router } from "express";
import { env } from "../../config/env";
import { morphAnalyze } from "../translation/downstream";

export const posRouter = Router();

posRouter.post("/", async (req, res) => {
  const { text, sentence } = req.body || {};
  const input = text || sentence;

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return res.status(400).json({ error: "text (or sentence) is required" });
  }

  try {
    const result = await morphAnalyze({ text: input.trim() });
    return res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("DOWNSTREAM_") && env.NODE_ENV === "development") {
      return res.status(502).json({ error: "Morphological analysis service error", details: e.message });
    }
    return res.status(502).json({ error: "Morphological analysis service error" });
  }
});
