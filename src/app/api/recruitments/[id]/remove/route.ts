import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { removeInvite } from "@/lib/prikedin/removeInvite";

/** O criador remove qualquer outro participante (confirmado, em espera,
 * pendente ou que recusou) — nunca a si mesmo (ele sai fechando/cancelando a
 * vaga, não removendo a própria participação). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const targetUserId = body?.userId as string | undefined;
  if (!targetUserId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
  }

  const recruitment = await prisma.recruitment.findUnique({ where: { id } });
  if (!recruitment) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  if (recruitment.createdById !== user.id) {
    return NextResponse.json({ error: "Só quem criou a vaga pode remover participantes" }, { status: 403 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Você não pode remover a si mesmo" }, { status: 400 });
  }

  const invite = await removeInvite(id, targetUserId);
  if (!invite) {
    return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
