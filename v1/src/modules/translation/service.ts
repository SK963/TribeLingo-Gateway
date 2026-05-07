import { prisma } from "../db/prisma";
import { redis } from "../cache/redis";

export type TranslationRecord = {
  id: string;
  userId: string;
  sourceText: string;
  sourceLang: string | null;
  targetLang: string | null;
  translatedText: string;
  provider: string | null;
  createdAt: Date;
};

function historyKey(userId: string) {
  return `user:history:${userId}`;
}

export async function saveTranslationAndCache(input: {
  userId: string;
  sourceText: string;
  sourceLang?: string;
  targetLang?: string;
  translatedText: string;
  provider?: string;
}) {
  const record = await prisma.translation.create({
    data: {
      userId: input.userId,
      sourceText: input.sourceText,
      sourceLang: input.sourceLang ?? null,
      targetLang: input.targetLang ?? null,
      translatedText: input.translatedText,
      provider: input.provider ?? null,
    },
  });

  const obj = {
    id: record.id,
    userId: record.userId,
    sourceText: record.sourceText,
    sourceLang: record.sourceLang,
    targetLang: record.targetLang,
    translatedText: record.translatedText,
    provider: record.provider,
    isPinned: record.isPinned,
    createdAt: record.createdAt,
  };

  const key = historyKey(input.userId);
  await redis.multi().lpush(key, JSON.stringify(obj)).ltrim(key, 0, 99).exec();

  return record;
}

export async function getHistory(userId: string) {
  const key = historyKey(userId);
  const cached = await redis.lrange(key, 0, 99);
  if (cached.length > 0) {
    return cached.map((s) => JSON.parse(s) as unknown);
  }

  const rows = await prisma.translation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // warm asynchronously (best-effort)
  void (async () => {
    try {
      if (rows.length === 0) return;
      const pipeline = redis.multi();
      for (const row of rows) pipeline.rpush(key, JSON.stringify(row));
      pipeline.ltrim(key, 0, 99);
      await pipeline.exec();
    } catch {
      // ignore cache warm failures
    }
  })();

  return rows;
}

