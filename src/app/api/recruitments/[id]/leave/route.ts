import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { removeInvite } from "@/lib/prikedin/removeInvite";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const recruitment = await prisma.recruitment.findUnique({ where: { id } });
  if (!recruitment) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  if (recruitment.createdById === user.id) {
    return NextResponse.json(
      { error: "Quem criou a vaga não pode sair dela — feche a vaga em vez disso" },
      { status: 400 },
    );
  }

  const invite = await removeInvite(id, user.id);
  if (!invite) {
    return NextResponse.json({ error: "Você não está nessa vaga" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
