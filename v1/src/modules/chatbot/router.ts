import { Router } from "express";
import { env } from "../../config/env";
import { chatWithBot, chatbotHealth } from "./downstream";

export const chatbotRouter = Router();

chatbotRouter.post("/", async (req, res) => {
  const { user_query } = req.body || {};

  if (!user_query || typeof user_query !== "string" || user_query.trim().length === 0) {
    return res.status(400).json({ error: "user_query is required" });
  }

  try {
    const result = await chatWithBot({ user_query: user_query.trim() });
    return res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("DOWNSTREAM_") && env.NODE_ENV === "development") {
      return res.status(502).json({ error: "Chatbot service error", details: e.message });
    }
    return res.status(502).json({ error: "Chatbot service error" });
  }
});

chatbotRouter.get("/health", async (_req, res) => {
  try {
    const result = await chatbotHealth();
    return res.json(result);
  } catch (e) {
    if (e instanceof Error && env.NODE_ENV === "development") {
      return res.status(502).json({ error: "Chatbot service unreachable", details: e.message });
    }
    return res.status(502).json({ error: "Chatbot service unreachable" });
  }
});

// Authenticated Routes
import { authMiddleware, type AuthedRequest } from "../auth/middleware";
import { prisma } from "../db/prisma";

chatbotRouter.use(authMiddleware as any);

chatbotRouter.get("/conversations", async (req: AuthedRequest, res) => {
  try {
    const conversations = await prisma.chatConversation.findMany({
      where: { userId: req.auth!.sub },
      orderBy: { updatedAt: "desc" },
    });
    return res.json(conversations);
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

chatbotRouter.post("/conversations", async (req: AuthedRequest, res) => {
  try {
    const { title } = req.body;
    const conv = await prisma.chatConversation.create({
      data: {
        userId: req.auth!.sub,
        title: title || "New Chat",
      },
    });
    return res.status(201).json(conv);
  } catch (e) {
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

chatbotRouter.get("/conversations/:id/messages", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id as string;
    const conv = await prisma.chatConversation.findFirst({
      where: { id, userId: req.auth!.sub },
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });
    return res.json(messages);
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

chatbotRouter.post("/conversations/:id/messages", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id as string;
    const { role, text } = req.body;
    const conv = await prisma.chatConversation.findFirst({
      where: { id, userId: req.auth!.sub },
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: id,
        role,
        text,
      },
    });

    // Update conversation timestamp
    await prisma.chatConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json(msg);
  } catch (e) {
    return res.status(500).json({ error: "Failed to add message" });
  }
});
