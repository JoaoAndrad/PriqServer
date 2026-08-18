import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { expireStaleRecruitments } from "@/lib/prikedin/expiry";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  await expireStaleRecruitments({ id });

  const recruitment = await prisma.recruitment.findUnique({
    where: { id },
    include: { invites: true },
  });
  if (!recruitment) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  if (recruitment.status !== "open") {
    return NextResponse.json({ error: "Vaga não está mais aberta" }, { status: 409 });
  }

  const acceptedCount = recruitment.invites.filter((i) => i.status === "accepted").length;
  const full = recruitment.maxSlots != null && acceptedCount >= recruitment.maxSlots;
  const status = full ? "waitlisted" : "accepted";

  const invite = await prisma.recruitmentInvite.upsert({
    where: { recruitmentId_userId: { recruitmentId: id, userId: user.id } },
    create: {
      recruitmentId: id,
      userId: user.id,
      source: "joined",
      status,
      respondedAt: new Date(),
    },
    update: { status, respondedAt: new Date() },
  });

  return NextResponse.json({ invite });
}
