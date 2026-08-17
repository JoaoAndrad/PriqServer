import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { respondInviteSchema } from "@/lib/validation/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = respondInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "accept é obrigatório" }, { status: 400 });
  }

  const invite = await prisma.recruitmentInvite.findUnique({
    where: { recruitmentId_userId: { recruitmentId: id, userId: user.id } },
  });
  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const updated = await prisma.recruitmentInvite.update({
    where: { id: invite.id },
    data: {
      status: parsed.data.accept ? "accepted" : "declined",
      respondedAt: new Date(),
    },
  });

  return NextResponse.json({ invite: updated });
}
