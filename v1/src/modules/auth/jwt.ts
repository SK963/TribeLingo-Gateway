import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export type JwtClaims = {
  sub: string;
  email: string;
};

export function signAccessToken(claims: JwtClaims): string {
  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(claims, secret, options);
}

export function verifyAccessToken(token: string): JwtClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET as Secret);
  if (typeof decoded !== "object" || decoded === null) throw new Error("Invalid token");
  const { sub, email } = decoded as Record<string, unknown>;
  if (typeof sub !== "string" || typeof email !== "string") throw new Error("Invalid token claims");
  return { sub, email };
}

