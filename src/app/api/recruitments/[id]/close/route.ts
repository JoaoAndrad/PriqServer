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
  if (recruitment.createdById !== user.id) {
    return NextResponse.json({ error: "Só quem criou a vaga pode fechá-la" }, { status: 403 });
  }

  const updated = await prisma.recruitment.update({
    where: { id },
    data: { status: "closed" },
  });

  return NextResponse.json({ recruitment: updated });
}
