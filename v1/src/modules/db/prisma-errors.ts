import { Prisma } from "@prisma/client";

export function prismaClientErrorResponse(e: unknown): { status: number; body: Record<string, unknown> } | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return {
      status: 503,
      body: {
        error: "Database schema is not ready",
        hint: 'Run `npm run prisma:migrate:dev` (or `prisma migrate deploy`) so tables exist.',
      },
    };
  }
  return null;
}
