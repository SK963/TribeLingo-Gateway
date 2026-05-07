import { Router } from "express";
import { env } from "../../config/env";
import { TranslateSchema } from "./validation";
import { translate, morphAnalyze } from "./downstream";
import { authMiddleware, type AuthedRequest } from "../auth/middleware";
import { getHistory, saveTranslationAndCache } from "./service";
import { prisma } from "../db/prisma";
import { redis } from "../cache/redis";

function downstreamCatch(res: import("express").Response, e: unknown) {
  if (e instanceof Error && e.message === "TRANSLATION_TARGET_REQUIRED") {
    return res.status(400).json({ error: "targetLang is required" });
  }
  if (e instanceof Error && e.message.startsWith("DOWNSTREAM_") && env.NODE_ENV === "development") {
    return res.status(502).json({ error: "Downstream service error", details: e.message });
  }
  return res.status(502).json({ error: "Downstream service error" });
}

export const translationRouter = Router();

// Unauthenticated: just proxy translation + pos
translationRouter.post("/direct", async (req, res) => {
  const parsed = TranslateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const t = await translate(parsed.data);
    const translatedText = (t.translatedText ?? t.translation ?? t.text) as string | undefined;
    const isSourceKokborok = parsed.data.sourceLang === "kokborok" || parsed.data.sourceLang === "lus_Latn";
    const textToTag = isSourceKokborok ? parsed.data.text : (translatedText ?? parsed.data.text);

    // Morphological analysis should never block translation
    let morphology = {};
    try {
      morphology = await morphAnalyze({ text: textToTag, lang: "kokborok" });
    } catch (morphErr) {
      if (env.NODE_ENV === "development") console.error("[gateway] morph analysis failed (non-blocking):", morphErr);
    }

    return res.json({ translation: t, morphology });
  } catch (e) {
    return downstreamCatch(res, e);
  }
});

// Authenticated: proxy + persist translation (not pos) + update cache
translationRouter.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  const parsed = TranslateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const t = await translate(parsed.data);
    const translatedText = (t.translatedText ?? t.translation ?? t.text) as string | undefined;
    if (!translatedText) return res.status(502).json({ error: "Invalid translation response" });

    const isSourceKokborok = parsed.data.sourceLang === "kokborok" || parsed.data.sourceLang === "lus_Latn";
    const textToTag = isSourceKokborok ? parsed.data.text : translatedText;

    // Morphological analysis should never block translation
    let morphology = {};
    try {
      morphology = await morphAnalyze({ text: textToTag, lang: "kokborok" });
    } catch (morphErr) {
      if (env.NODE_ENV === "development") console.error("[gateway] morph analysis failed (non-blocking):", morphErr);
    }

    // Persist translation — should never block the response
    let saved = null;
    try {
      saved = await saveTranslationAndCache({
        userId: req.auth!.sub,
        sourceText: parsed.data.text,
        sourceLang: parsed.data.sourceLang,
        targetLang: parsed.data.targetLang,
        translatedText,
        provider: (t.provider as string | undefined) ?? undefined,
      });
    } catch (saveErr) {
      if (env.NODE_ENV === "development") console.error("[gateway] save translation failed (non-blocking):", saveErr);
    }

    return res.status(201).json({ translation: t, morphology, saved });
  } catch (e) {
    if (env.NODE_ENV === "development") console.error("[gateway] authenticated translation error:", e);
    return downstreamCatch(res, e);
  }
});

translationRouter.get("/history", authMiddleware, async (req: AuthedRequest, res) => {
  const history = await getHistory(req.auth!.sub);
  return res.json({ items: history });
});

translationRouter.delete("/history", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    await prisma.translation.deleteMany({
      where: { userId: req.auth!.sub },
    });
    // Clear cache
    await redis.del(`user:history:${req.auth!.sub}`);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to clear history" });
  }
});

translationRouter.patch("/history/:id/pin", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id as string;
    const { isPinned } = req.body;
    const record = await prisma.translation.update({
      where: { id, userId: req.auth!.sub },
      data: { isPinned: !!isPinned },
    });
    // Clear cache to let it refresh with updated isPinned
    await redis.del(`user:history:${req.auth!.sub}`);
    return res.json({ success: true, record });
  } catch (e) {
    return res.status(500).json({ error: "Failed to pin translation" });
  }
});

