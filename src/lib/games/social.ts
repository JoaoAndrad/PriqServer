import { prisma } from "@/lib/prisma";

export interface GameSocialLists {
  ownedBy: string[];
  favoritedBy: string[];
  interestedBy: string[];
}

/**
 * Pra cada gameId, lista os displayName de quem já possui/favoritou/tem
 * interesse nesse jogo — usado pra mostrar "Na biblioteca de Fulano" nos
 * resultados de busca antes mesmo da pessoa adicionar o jogo. Exclui
 * `excludeUserId` (o próprio usuário vendo a tela) das listas.
 */
export async function getGameSocialLists(
  gameIds: string[],
  excludeUserId?: string,
): Promise<Map<string, GameSocialLists>> {
  const map = new Map<string, GameSocialLists>();
  if (gameIds.length === 0) return map;

  const rows = await prisma.userGame.findMany({
    where: {
      gameId: { in: gameIds },
      userId: excludeUserId ? { not: excludeUserId } : undefined,
      OR: [{ owned: true }, { favorite: true }, { interested: true }],
    },
    include: { user: { select: { displayName: true } } },
  });

  for (const row of rows) {
    const entry = map.get(row.gameId) ?? { ownedBy: [], favoritedBy: [], interestedBy: [] };
    if (row.owned) entry.ownedBy.push(row.user.displayName);
    if (row.favorite) entry.favoritedBy.push(row.user.displayName);
    if (row.interested) entry.interestedBy.push(row.user.displayName);
    map.set(row.gameId, entry);
  }

  return map;
}
