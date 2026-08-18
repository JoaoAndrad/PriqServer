import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { respondInviteSchema } from "@/lib/validation/schemas";
import { expireStaleRecruitments } from "@/lib/prikedin/expiry";

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

  await expireStaleRecruitments({ id });

  const invite = await prisma.recruitmentInvite.findUnique({
    where: { recruitmentId_userId: { recruitmentId: id, userId: user.id } },
  });
  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const recruitment = await prisma.recruitment.findUnique({
    where: { id },
    include: { invites: true },
  });
  if (!recruitment) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  if (parsed.data.accept && recruitment.status !== "open") {
    return NextResponse.json({ error: "Vaga não está mais aberta" }, { status: 409 });
  }

  let status = parsed.data.accept ? "accepted" : "declined";
  if (status === "accepted") {
    const acceptedCount = recruitment.invites.filter(
      (i) => i.status === "accepted" && i.id !== invite.id,
    ).length;
    if (recruitment.maxSlots != null && acceptedCount >= recruitment.maxSlots) {
      status = "waitlisted";
    }
  }

  const updated = await prisma.recruitmentInvite.update({
    where: { id: invite.id },
    data: { status, respondedAt: new Date() },
  });

  return NextResponse.json({ invite: updated });
}
