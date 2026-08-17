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

  const recruitment = await prisma.recruitment.findUnique({ where: { id } });
  if (!recruitment) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  if (recruitment.status !== "open") {
    return NextResponse.json({ error: "Vaga não está mais aberta" }, { status: 409 });
  }

  const invite = await prisma.recruitmentInvite.upsert({
    where: { recruitmentId_userId: { recruitmentId: id, userId: user.id } },
    create: {
      recruitmentId: id,
      userId: user.id,
      source: "joined",
      status: "accepted",
      respondedAt: new Date(),
    },
    update: { status: "accepted", respondedAt: new Date() },
  });

  return NextResponse.json({ invite });
}
