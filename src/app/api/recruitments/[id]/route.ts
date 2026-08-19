import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rankCandidates } from "@/lib/prikedin/rankCandidates";
import { expireStaleRecruitments, isPastExpiry } from "@/lib/prikedin/expiry";
import { updateRecruitmentSchema } from "@/lib/validation/schemas";

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

/** Só o criador edita dia/horário/vagas máximas. Editar reabre a vaga
 * automaticamente se ela tinha expirado e a nova data ainda está no futuro —
 * mas nunca reabre uma vaga fechada manualmente ("closed"). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateRecruitmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const recruitment = await prisma.recruitment.findUnique({ where: { id } });
  if (!recruitment) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  if (recruitment.createdById !== user.id) {
    return NextResponse.json({ error: "Só quem criou a vaga pode editar" }, { status: 403 });
  }
  if (recruitment.status === "closed") {
    return NextResponse.json({ error: "Vaga fechada não pode ser editada" }, { status: 409 });
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : recruitment.scheduledAt;
  const hasTime = parsed.data.hasTime ?? recruitment.hasTime;
  const stillExpired = isPastExpiry(scheduledAt, hasTime);

  const updated = await prisma.recruitment.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title || null } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.scheduledAt ? { scheduledAt } : {}),
      ...(parsed.data.hasTime !== undefined ? { hasTime: parsed.data.hasTime } : {}),
      ...(parsed.data.maxSlots !== undefined ? { maxSlots: parsed.data.maxSlots } : {}),
      status: stillExpired ? "expired" : "open",
    },
    include: { game: true },
  });

  return NextResponse.json({ recruitment: updated });
}
