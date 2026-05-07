import type { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { verifyAccessToken, type JwtClaims } from "./jwt";

declare global {
  // eslint-disable-next-line no-var
  var __auth: undefined;
}

export type AuthedRequest = Request & { auth?: JwtClaims };

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const cookieToken = req.cookies?.[env.AUTH_COOKIE_NAME] as string | undefined;

  const token =
    header?.toLowerCase().startsWith("bearer ") ? header.slice("bearer ".length).trim() : cookieToken;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

