import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { drawGame } from "@/lib/draw/pickGame";
import { drawSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = drawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userIds é obrigatório" }, { status: 400 });
  }

  const result = await drawGame(
    parsed.data.userIds,
    parsed.data.requireOwned ?? false,
    parsed.data.modeFilter ?? "any",
  );

  const gameIds = [
    ...(result.pickedGameId ? [result.pickedGameId] : []),
    ...result.fallback.map((f) => f.gameId),
  ];
  const games = await prisma.game.findMany({ where: { id: { in: gameIds } } });
  const gameById = new Map(games.map((g) => [g.id, g]));

  return NextResponse.json({
    picked: result.pickedGameId ? gameById.get(result.pickedGameId) ?? null : null,
    fallbackUsed: result.fallbackUsed,
    fallback: result.fallback.map((f) => ({ ...f, game: gameById.get(f.gameId) ?? null })),
  });
}
