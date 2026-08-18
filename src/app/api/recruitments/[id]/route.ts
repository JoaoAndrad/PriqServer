import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rankCandidates } from "@/lib/prikedin/rankCandidates";
import { expireStaleRecruitments } from "@/lib/prikedin/expiry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  await expireStaleRecruitments({ id });

  const recruitment = await prisma.recruitment.findUnique({
    where: { id },
    include: {
      game: true,
      createdBy: { select: { id: true, displayName: true, avatarPath: true } },
      invites: { include: { user: { select: { id: true, displayName: true, avatarPath: true } } } },
    },
  });

  if (!recruitment) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  const isCreator = recruitment.createdById === user.id;
  const isConfirmedParticipant = recruitment.invites.some(
    (i) => i.userId === user.id && i.status === "accepted",
  );

  const candidates =
    isCreator || isConfirmedParticipant
      ? await rankCandidates(recruitment.gameId, user.id)
      : [];

  return NextResponse.json({ recruitment, candidates });
}
