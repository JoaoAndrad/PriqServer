import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureGameByTgdbId, ensureGameBySteamAppId } from "@/lib/games/search";
import { userGameFlagsSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = userGameFlagsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { tgdbId, steamAppId, gameId, ...flags } = parsed.data;

  let game;
  try {
    if (gameId) {
      // ação explícita do usuário sobre um jogo já em cache (ex.: achou na busca
      // livre e agora tá favoritando/marcando como possuído) — vira elegível pro /swipe
      game = await prisma.game.update({ where: { id: gameId }, data: { discoverable: true } });
    } else if (steamAppId) {
      game = await ensureGameBySteamAppId(steamAppId);
    } else {
      game = await ensureGameByTgdbId(tgdbId!);
    }
  } catch {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  const userGame = await prisma.userGame.upsert({
    where: { userId_gameId: { userId: user.id, gameId: game.id } },
    create: { userId: user.id, gameId: game.id, ...flags },
    update: flags,
    include: { game: true },
  });

  return NextResponse.json({ userGame });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "gameId é obrigatório" }, { status: 400 });
  }

  await prisma.userGame
    .delete({ where: { userId_gameId: { userId: user.id, gameId } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
