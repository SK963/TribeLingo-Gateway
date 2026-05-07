import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env";
import { prisma } from "../db/prisma";
import { encryptOptional } from "./crypto";

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export async function signupWithPassword(input: { fullName: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("EMAIL_IN_USE");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      credentials: { create: { passwordHash: await argon2.hash(input.password) } },
    },
  });

  return user;
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { credentials: true },
  });
  if (!user?.credentials) throw new Error("INVALID_CREDENTIALS");

  const ok = await argon2.verify(user.credentials.passwordHash, input.password);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  return user;
}

export async function upsertFromGoogleAccessToken(input: { accessToken: string }) {
  // 1. Fetch User Profile
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  if (!userRes.ok) throw new Error("GOOGLE_TOKEN_INVALID");
  const payload = await userRes.json() as Record<string, any>;

  if (!payload?.email || !payload.sub) throw new Error("GOOGLE_TOKEN_INVALID");

  const email = payload.email.toLowerCase();
  const emailVerified = Boolean(payload.email_verified);

  // Anchor on email (only auto-link if verified)
  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email,
        fullName: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      },
    }));

  if (!emailVerified) {
    // For safety: don't link unverified emails to an existing user
    if (existingUser) throw new Error("EMAIL_NOT_VERIFIED");
  }

  await prisma.linkedAccount.upsert({
    where: { provider_providerUserId: { provider: "google", providerUserId: payload.sub } },
    update: {
      userId: user.id,
      emailVerified,
      accessTokenEnc: encryptOptional(input.accessToken),
    },
    create: {
      userId: user.id,
      provider: "google",
      providerUserId: payload.sub,
      emailVerified,
      accessTokenEnc: encryptOptional(input.accessToken),
    },
  });

  // Keep profile fresh
  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: payload.name ?? user.fullName,
      avatarUrl: payload.picture ?? user.avatarUrl,
    },
  });

  return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
}

export async function upsertFromGithubToken(input: { code: string }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error("GITHUB_NOT_CONFIGURED");
  }

  // 1. Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: input.code,
      redirect_uri: env.GITHUB_REDIRECT_URI || "http://localhost:5173/auth/github/callback",
    }),
  });

  const tokenData = await tokenRes.json() as Record<string, any>;
  if (tokenData.error) {
    throw new Error("GITHUB_TOKEN_INVALID");
  }
  const accessToken = tokenData.access_token;

  // 2. Fetch User Profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error("GITHUB_TOKEN_INVALID");
  const githubUser = await userRes.json() as Record<string, any>;

  // 3. Fetch User Emails (GitHub might not return email in profile if it's private)
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!emailsRes.ok) throw new Error("GITHUB_TOKEN_INVALID");
  const emailsData = await emailsRes.json() as Array<{ primary?: boolean; verified?: boolean; email: string }>;
  
  // Find primary verified email
  const primaryEmailObj = emailsData.find((e: any) => e.primary && e.verified) || emailsData.find((e: any) => e.verified);
  if (!primaryEmailObj) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  const email = primaryEmailObj.email.toLowerCase();
  const providerUserId = String(githubUser.id);

  // Anchor on email (only auto-link if verified)
  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email,
        fullName: githubUser.name ?? githubUser.login ?? null,
        avatarUrl: githubUser.avatar_url ?? null,
      },
    }));

  await prisma.linkedAccount.upsert({
    where: { provider_providerUserId: { provider: "github", providerUserId } },
    update: {
      userId: user.id,
      emailVerified: true,
      accessTokenEnc: encryptOptional(accessToken), // we encrypt the token for security
    },
    create: {
      userId: user.id,
      provider: "github",
      providerUserId,
      emailVerified: true,
      accessTokenEnc: encryptOptional(accessToken),
    },
  });

  // Keep profile fresh
  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: githubUser.name ?? githubUser.login ?? user.fullName,
      avatarUrl: githubUser.avatar_url ?? user.avatarUrl,
    },
  });

  return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
}
