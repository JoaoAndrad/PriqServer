import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createRecruitment } from "@/lib/prikedin/createRecruitment";
import { createRecruitmentSchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope") ?? "feed";

  let where: Prisma.RecruitmentWhereInput;
  if (scope === "mine") {
    where = { createdById: user.id };
  } else if (scope === "invited") {
    where = { invites: { some: { userId: user.id } } };
  } else {
    where = { status: "open" };
  }

  const recruitments = await prisma.recruitment.findMany({
    where,
    include: {
      game: true,
      createdBy: { select: { id: true, displayName: true, avatarPath: true } },
      invites: {
        include: { user: { select: { id: true, displayName: true, avatarPath: true } } },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ recruitments });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createRecruitmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const recruitment = await createRecruitment(
    user.id,
    parsed.data.gameId,
    new Date(parsed.data.scheduledAt),
    parsed.data.hasTime ?? true,
  );

  return NextResponse.json({ recruitment }, { status: 201 });
}
