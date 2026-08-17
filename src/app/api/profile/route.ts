import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  steamId64: z.string().trim().min(1).max(40).optional().or(z.literal("")),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatarPath: true,
      steamId64: true,
    },
  });

  return NextResponse.json({ user: full });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { steamId64, ...rest } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...rest,
      ...(steamId64 !== undefined ? { steamId64: steamId64 || null } : {}),
    },
    select: { id: true, displayName: true, steamId64: true },
  });

  return NextResponse.json({ user: updated });
}
