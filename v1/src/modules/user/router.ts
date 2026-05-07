import { Router } from "express";
import { authMiddleware, type AuthedRequest } from "../auth/middleware";
import { prismaClientErrorResponse } from "../db/prisma-errors";
import { UpdateUserSchema } from "./validation";
import { deleteUser, getUserById, updateUser } from "./service";

export const userRouter = Router();

userRouter.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl });
  } catch (e) {
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    return res.status(500).json({ error: "Internal server error" });
  }
});

userRouter.patch("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const user = await updateUser(req.auth!.sub, parsed.data);
    return res.json({ id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl });
  } catch (e) {
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    if (e instanceof Error && e.message.includes("Unique constraint")) return res.status(409).json({ error: "Email in use" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

userRouter.delete("/me", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    await deleteUser(req.auth!.sub);
    return res.status(204).send();
  } catch (e) {
    const pe = prismaClientErrorResponse(e);
    if (pe) return res.status(pe.status).json(pe.body);
    return res.status(500).json({ error: "Internal server error" });
  }
});

