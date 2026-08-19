import { prisma } from "@/lib/prisma";

/**
 * Remove um convite/participação (usado tanto por quem sai por conta própria
 * quanto pelo criador removendo outro participante). Se a vaga removida era
 * "accepted", promove o primeiro da lista de espera pra liberar a vaga.
 */
export async function removeInvite(recruitmentId: string, userId: string) {
  const invite = await prisma.recruitmentInvite.findUnique({
    where: { recruitmentId_userId: { recruitmentId, userId } },
  });
  if (!invite) return null;

  const wasAccepted = invite.status === "accepted";

  await prisma.recruitmentInvite.delete({ where: { id: invite.id } });

  if (wasAccepted) {
    const nextInLine = await prisma.recruitmentInvite.findFirst({
      where: { recruitmentId, status: "waitlisted" },
      orderBy: { createdAt: "asc" },
    });
    if (nextInLine) {
      await prisma.recruitmentInvite.update({
        where: { id: nextInLine.id },
        data: { status: "accepted", respondedAt: new Date() },
      });
    }
  }

  return invite;
}
