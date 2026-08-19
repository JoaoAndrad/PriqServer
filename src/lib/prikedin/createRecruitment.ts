import { prisma } from "@/lib/prisma";

export async function createRecruitment(
  createdById: string,
  gameId: string,
  scheduledAt: Date,
  hasTime = true,
  maxSlots?: number,
  title?: string,
  description?: string,
) {
  // Quem cria a vaga já entra como confirmado — não faz sentido o próprio
  // recrutador aparecer como "não convidado" na lista de participantes.
  return prisma.recruitment.create({
    data: {
      createdById,
      gameId,
      title: title || null,
      description: description || null,
      scheduledAt,
      hasTime,
      maxSlots: maxSlots ?? null,
      invites: {
        create: { userId: createdById, source: "creator", status: "accepted", respondedAt: new Date() },
      },
    },
    include: { game: true },
  });
}
