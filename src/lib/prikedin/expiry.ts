import { prisma } from "@/lib/prisma";

export const RECRUITMENT_TTL_MS = 3 * 60 * 60 * 1000; // 3 horas após scheduledAt

export function expiresAt(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() + RECRUITMENT_TTL_MS);
}

export function isPastExpiry(scheduledAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= expiresAt(scheduledAt).getTime();
}

/**
 * Marca como "expired" (lazy, no read) qualquer vaga "open" cujo prazo de 3h após
 * scheduledAt já tenha passado. Não há job/cron no projeto, então a expiração é
 * verificada sob demanda nas rotas de leitura.
 */
export async function expireStaleRecruitments(where?: { id?: string }) {
  const now = new Date();
  await prisma.recruitment.updateMany({
    where: {
      status: "open",
      scheduledAt: { lte: new Date(now.getTime() - RECRUITMENT_TTL_MS) },
      ...(where?.id ? { id: where.id } : {}),
    },
    data: { status: "expired" },
  });
}
