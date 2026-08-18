import { prisma } from "@/lib/prisma";

export async function createRecruitment(
  createdById: string,
  gameId: string,
  scheduledAt: Date,
  hasTime = true,
  maxSlots?: number,
) {
  return prisma.recruitment.create({
    data: { createdById, gameId, scheduledAt, hasTime, maxSlots: maxSlots ?? null },
    include: { game: true },
  });
}
