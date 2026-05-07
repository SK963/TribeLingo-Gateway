import { Router } from "express";
import { prisma } from "../db/prisma";

export const dictionaryRouter = Router();

dictionaryRouter.get("/", async (req, res, next) => {
  try {
    const { q, pos } = req.query;

    const query: any = {};
    if (q) {
      const search = String(q).trim();
      query.OR = [
        { word: { contains: search, mode: "insensitive" } },
        { meaning: { contains: search, mode: "insensitive" } },
      ];
    }

    if (pos && typeof pos === "string") {
      // e.g. "Noun", "Verb", "Adjective"
      query.pos = { equals: pos, mode: "insensitive" };
    }

    const entries = await prisma.dictionaryEntry.findMany({
      where: query,
      orderBy: { word: "asc" },
      take: 100, // Limit results
    });

    res.json({ items: entries });
  } catch (err) {
    next(err);
  }
});

dictionaryRouter.get("/:id", async (req, res, next) => {
  try {
    const entry = await prisma.dictionaryEntry.findUnique({
      where: { id: req.params.id },
    });
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});
