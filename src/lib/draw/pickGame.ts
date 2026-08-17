import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { computeCommonGames } from "@/lib/matching/commonGames";

export interface FallbackEntry {
  gameId: string;
  interestedCount: number;
  favoriteCount: number;
}

export interface DrawResult {
  pickedGameId: string | null;
  candidateGameIds: string[];
  fallback: FallbackEntry[];
  fallbackUsed: boolean;
}

export function pickRandom<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("Não é possível sortear de uma lista vazia");
  }
  const idx = crypto.randomInt(items.length);
  return items[idx];
}

export async function drawGame(
  userIds: string[],
  requireOwned = false,
): Promise<DrawResult> {
  const common = await computeCommonGames(userIds, { requireOwned });

  if (common.length > 0) {
    const candidateGameIds = common.map((c) => c.gameId);
    return {
      pickedGameId: pickRandom(candidateGameIds),
      candidateGameIds,
      fallback: [],
      fallbackUsed: false,
    };
  }

  // fallback: união dos jogos "na lista" (interesse, favorito ou possui), ranqueado
  // por quantas pessoas selecionadas têm o jogo (excluindo blacklist), desempatando
  // por favoritos.
  const userGames = await prisma.userGame.findMany({
    where: {
      userId: { in: userIds },
      blacklisted: false,
      OR: [{ interested: true }, { favorite: true }, { owned: true }],
    },
  });

  const stats = new Map<string, { interested: Set<string>; favorite: Set<string> }>();
  for (const ug of userGames) {
    const s = stats.get(ug.gameId) ?? { interested: new Set(), favorite: new Set() };
    s.interested.add(ug.userId);
    if (ug.favorite) s.favorite.add(ug.userId);
    stats.set(ug.gameId, s);
  }

  const fallback: FallbackEntry[] = Array.from(stats.entries())
    .map(([gameId, s]) => ({
      gameId,
      interestedCount: s.interested.size,
      favoriteCount: s.favorite.size,
    }))
    .sort(
      (a, b) => b.interestedCount + b.favoriteCount - (a.interestedCount + a.favoriteCount),
    );

  if (fallback.length === 0) {
    return { pickedGameId: null, candidateGameIds: [], fallback: [], fallbackUsed: true };
  }

  // sorteia entre os empatados no topo do ranking, em vez de só listar tudo
  const topScore = fallback[0].interestedCount + fallback[0].favoriteCount;
  const topTier = fallback.filter((f) => f.interestedCount + f.favoriteCount === topScore);
  const pickedEntry = pickRandom(topTier);

  return {
    pickedGameId: pickedEntry.gameId,
    candidateGameIds: topTier.map((f) => f.gameId),
    fallback: fallback.slice(0, 5),
    fallbackUsed: true,
  };
}
