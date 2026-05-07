import { Router } from "express";
import { env } from "../../config/env";
import { prismaClientErrorResponse } from "../db/prisma-errors";
import { signAccessToken } from "./jwt";
import { GoogleTokenSchema, LoginPasswordSchema, SignupPasswordSchema } from "./validation";
import { loginWithPassword, signupWithPassword, upsertFromGoogleAccessToken, upsertFromGithubToken } from "./service";

export const authRouter = Router();

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
  });
}

authRouter.post("/signup", async (req, res) => {
  const parsed = SignupPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const user = await signupWithPassword(parsed.data);
    const token = signAccessToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.status(201).json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (e) {
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    if (e instanceof Error && e.message === "EMAIL_IN_USE") return res.status(409).json({ error: "Email in use" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const user = await loginWithPassword(parsed.data);
    const token = signAccessToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (e) {
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    if (e instanceof Error && e.message === "INVALID_CREDENTIALS")
      return res.status(401).json({ error: "Invalid credentials" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/google", async (req, res) => {
  const parsed = GoogleTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const user = await upsertFromGoogleAccessToken(parsed.data);
    const token = signAccessToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl } });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "GOOGLE_NOT_CONFIGURED") return res.status(501).json({ error: "Google login not configured" });
      if (e.message === "EMAIL_NOT_VERIFIED") return res.status(403).json({ error: "Email not verified" });
      if (e.message === "GOOGLE_TOKEN_INVALID") return res.status(401).json({ error: "Invalid Google token" });
    }
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/github", async (req, res) => {
  if (!req.body.code || typeof req.body.code !== "string") {
    return res.status(400).json({ error: "Invalid payload: code is required" });
  }

  try {
    const user = await upsertFromGithubToken({ code: req.body.code });
    const token = signAccessToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl } });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "GITHUB_NOT_CONFIGURED") return res.status(501).json({ error: "GitHub login not configured" });
      if (e.message === "EMAIL_NOT_VERIFIED") return res.status(403).json({ error: "GitHub email not verified" });
      if (e.message === "GITHUB_TOKEN_INVALID") return res.status(401).json({ error: "Invalid GitHub code or token" });
    }
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(env.AUTH_COOKIE_NAME, { path: "/" });
  return res.status(204).send();
});

