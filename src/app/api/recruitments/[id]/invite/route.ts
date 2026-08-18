import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { inviteSchema } from "@/lib/validation/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userIds é obrigatório" }, { status: 400 });
  }

  const recruitment = await prisma.recruitment.findUnique({
    where: { id },
    include: { invites: true },
  });
  if (!recruitment) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });

  const myInvite = recruitment.invites.find((i) => i.userId === user.id);
  const isCreator = recruitment.createdById === user.id;
  const isConfirmedParticipant = myInvite?.status === "accepted";
  if (!isCreator && !isConfirmedParticipant) {
    return NextResponse.json(
      { error: "Só quem criou a vaga ou já está confirmado pode convidar" },
      { status: 403 },
    );
  }

  await prisma.$transaction(
    parsed.data.userIds.map((userId) =>
      prisma.recruitmentInvite.upsert({
        where: { recruitmentId_userId: { recruitmentId: id, userId } },
        create: { recruitmentId: id, userId, source: "invited", status: "pending" },
        update: {},
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
