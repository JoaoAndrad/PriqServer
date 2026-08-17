import { prisma } from "@/lib/prisma";

export async function createRecruitment(
  createdById: string,
  gameId: string,
  scheduledAt: Date,
  hasTime = true,
) {
  return prisma.recruitment.create({
    data: { createdById, gameId, scheduledAt, hasTime },
    include: { game: true },
  });
}
