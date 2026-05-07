import { z } from "zod";

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(200).optional(),
});

