import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { drawGame, type GameUserLists } from "@/lib/draw/pickGame";
import { drawSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { ensureGameModes } from "@/lib/games/modes";

/** Troca ids de usuário pelos displayName, pra mostrar "Favoritado por Fulano, Beltrano" no front. */
function resolveNames(lists: GameUserLists, namesById: Map<string, string>) {
  return {
    interestedBy: lists.interestedUserIds.map((id) => namesById.get(id) ?? "?"),
    favoritedBy: lists.favoriteUserIds.map((id) => namesById.get(id) ?? "?"),
    ownedBy: lists.ownedUserIds.map((id) => namesById.get(id) ?? "?"),
  };
}

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
  // gênero/descrição são buscados sob demanda na Steam só na primeira vez —
  // depois fica em cache, igual no /swipe.
  const gameById = await ensureGameModes(games);

  const allUserIds = new Set(
    [
      ...(result.pickedStats
        ? [
            ...result.pickedStats.interestedUserIds,
            ...result.pickedStats.favoriteUserIds,
            ...result.pickedStats.ownedUserIds,
          ]
        : []),
      ...result.fallback.flatMap((f) => [...f.interestedUserIds, ...f.favoriteUserIds, ...f.ownedUserIds]),
    ],
  );
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, displayName: true },
  });
  const namesById = new Map(users.map((u) => [u.id, u.displayName]));

  return NextResponse.json({
    picked: result.pickedGameId ? gameById.get(result.pickedGameId) ?? null : null,
    pickedNames: result.pickedStats ? resolveNames(result.pickedStats, namesById) : null,
    fallbackUsed: result.fallbackUsed,
    fallback: result.fallback.map((f) => ({
      ...f,
      game: gameById.get(f.gameId) ?? null,
      ...resolveNames(f, namesById),
    })),
  });
}
