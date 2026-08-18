import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const invite = await prisma.recruitmentInvite.findUnique({
    where: { recruitmentId_userId: { recruitmentId: id, userId: user.id } },
  });
  if (!invite) {
    return NextResponse.json({ error: "Você não está nessa vaga" }, { status: 404 });
  }

  const wasAccepted = invite.status === "accepted";

  await prisma.recruitmentInvite.delete({ where: { id: invite.id } });

  if (wasAccepted) {
    // libera uma vaga: promove o primeiro da lista de espera, se houver
    const nextInLine = await prisma.recruitmentInvite.findFirst({
      where: { recruitmentId: id, status: "waitlisted" },
      orderBy: { createdAt: "asc" },
    });
    if (nextInLine) {
      await prisma.recruitmentInvite.update({
        where: { id: nextInLine.id },
        data: { status: "accepted", respondedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
