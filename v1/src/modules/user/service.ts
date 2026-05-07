import argon2 from "argon2";
import { prisma } from "../db/prisma";

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function updateUser(
  userId: string,
  input: { fullName?: string; email?: string; password?: string }
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      email: input.email?.toLowerCase(),
      ...(input.password
        ? {
            credentials: {
              upsert: {
                create: { passwordHash: await argon2.hash(input.password) },
                update: { passwordHash: await argon2.hash(input.password) },
              },
            },
          }
        : {}),
    },
  });
  return updated;
}

export async function deleteUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

