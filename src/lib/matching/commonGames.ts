import { prisma } from "@/lib/prisma";

export interface CommonGameResult {
  gameId: string;
  favoriteCount: number;
  interestedUserIds: string[];
}

/**
 * Interseção de jogos "na lista" de todos os usuários informados — conta qualquer
 * jogo marcado como interesse, favorito ou possui (não precisa ser só "interesse"),
 * excluindo quem tem o jogo na blacklist (regra: blacklist só exclui quem blacklistou,
 * não veta o jogo pro resto do grupo — mas numa interseção estrita isso já basta pra
 * excluir automaticamente, já que a pessoa blacklistada não conta como "na lista").
 */
export async function computeCommonGames(
  userIds: string[],
  options: { requireOwned?: boolean } = {},
): Promise<CommonGameResult[]> {
  if (userIds.length === 0) return [];

  const userGames = await prisma.userGame.findMany({
    where: { userId: { in: userIds } },
  });

  const byGame = new Map<string, typeof userGames>();
  for (const ug of userGames) {
    const list = byGame.get(ug.gameId) ?? [];
    list.push(ug);
    byGame.set(ug.gameId, list);
  }

  const results: CommonGameResult[] = [];

  for (const [gameId, rows] of byGame.entries()) {
    const byUser = new Map(rows.map((r) => [r.userId, r]));

    const allInterested = userIds.every((uid) => {
      const row = byUser.get(uid);
      if (!row || row.blacklisted) return false;
      return row.interested || row.favorite || row.owned;
    });
    if (!allInterested) continue;

    if (options.requireOwned) {
      const allOwned = userIds.every((uid) => byUser.get(uid)?.owned);
      if (!allOwned) continue;
    }

    const favoriteCount = userIds.filter((uid) => byUser.get(uid)?.favorite).length;

    results.push({ gameId, favoriteCount, interestedUserIds: userIds });
  }

  return results.sort((a, b) => b.favoriteCount - a.favoriteCount);
}
