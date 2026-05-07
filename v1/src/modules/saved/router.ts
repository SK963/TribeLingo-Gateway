import { Router } from "express";
import { prisma } from "../db/prisma";
import { authMiddleware, type AuthedRequest } from "../auth/middleware";

export const savedRouter = Router();

savedRouter.use(authMiddleware as any);

/* ================================================================== */
/*  Folders                                                            */
/* ================================================================== */

savedRouter.get("/folders", async (req: AuthedRequest, res, next) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.auth!.sub },
      include: {
        _count: {
          select: { savedPhrases: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

savedRouter.post("/folders", async (req: AuthedRequest, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name is required" });

    const folder = await prisma.folder.create({
      data: {
        userId: req.auth!.sub,
        name,
        color: color || "bg-[#eff4ff]",
      },
    });
    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

savedRouter.put("/folders/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const { name, color } = req.body;
    const folder = await prisma.folder.updateMany({
      where: { id, userId: req.auth!.sub },
      data: { name, color },
    });
    if (folder.count === 0) return res.status(404).json({ error: "Folder not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

savedRouter.delete("/folders/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const folder = await prisma.folder.deleteMany({
      where: { id, userId: req.auth!.sub },
    });
    if (folder.count === 0) return res.status(404).json({ error: "Folder not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/* ================================================================== */
/*  Saved Phrases                                                      */
/* ================================================================== */

savedRouter.get("/phrases", async (req: AuthedRequest, res, next) => {
  try {
    const { folderId } = req.query;
    const phrases = await prisma.savedPhrase.findMany({
      where: {
        userId: req.auth!.sub,
        ...(folderId ? { folderId: String(folderId) } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(phrases);
  } catch (err) {
    next(err);
  }
});

savedRouter.post("/phrases", async (req: AuthedRequest, res, next) => {
  try {
    const { originalText, translatedText, sourceLang, targetLang, folderId, notes } = req.body;
    if (!originalText || !translatedText) {
      return res.status(400).json({ error: "Original and translated text are required" });
    }

    const finalFolderId = folderId ? folderId : null;

    if (finalFolderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: finalFolderId, userId: req.auth!.sub },
      });
      if (!folder) return res.status(403).json({ error: "Invalid folder" });
    }

    // Check for duplicates
    const existing = await prisma.savedPhrase.findFirst({
      where: {
        userId: req.auth!.sub,
        folderId: finalFolderId,
        originalText,
        translatedText,
      },
    });

    if (existing) {
      return res.status(400).json({ error: "This phrase is already saved in this location." });
    }

    const phrase = await prisma.savedPhrase.create({
      data: {
        userId: req.auth!.sub,
        folderId: finalFolderId,
        originalText,
        translatedText,
        sourceLang,
        targetLang,
        notes,
      },
    });
    res.status(201).json(phrase);
  } catch (err) {
    next(err);
  }
});

savedRouter.patch("/phrases/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const { originalText, translatedText, notes, folderId } = req.body;
    
    // If folderId is provided, verify it belongs to user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId: req.auth!.sub },
      });
      if (!folder) return res.status(403).json({ error: "Invalid folder" });
    }

    const phrase = await prisma.savedPhrase.updateMany({
      where: { id, userId: req.auth!.sub },
      data: {
        ...(originalText && { originalText }),
        ...(translatedText && { translatedText }),
        ...(notes !== undefined && { notes }),
        ...(folderId !== undefined && { folderId }),
      },
    });

    if (phrase.count === 0) return res.status(404).json({ error: "Phrase not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

savedRouter.delete("/phrases/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const phrase = await prisma.savedPhrase.deleteMany({
      where: { id, userId: req.auth!.sub },
    });
    if (phrase.count === 0) return res.status(404).json({ error: "Phrase not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
