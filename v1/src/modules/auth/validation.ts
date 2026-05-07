import { z } from "zod";

export const SignupPasswordSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const LoginPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const GoogleTokenSchema = z.object({
  accessToken: z.string().min(1),
});

