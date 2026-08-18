import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureGameModes, matchesModeFilter, type ModeFilter } from "@/lib/games/modes";

export interface GameUserLists {
  interestedUserIds: string[];
  favoriteUserIds: string[];
  ownedUserIds: string[];
}

export interface FallbackEntry extends GameUserLists {
  gameId: string;
  interestedCount: number;
  favoriteCount: number;
}

export interface DrawResult {
  pickedGameId: string | null;
  pickedStats: GameUserLists | null;
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

/** Sorteio ponderado: cada item concorre com chance proporcional ao seu peso,
 * em vez de restringir o sorteio só aos de maior peso. */
function pickWeighted<T extends { weight: number }>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("Não é possível sortear de uma lista vazia");
  }
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total <= 0) return pickRandom(items);

  let roll = crypto.randomInt(total);
  for (const item of items) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return items[items.length - 1];
}

/** Filtra jogos pelo modo pedido, garantindo antes que `modes` esteja no cache. */
async function filterByMode(gameIds: string[], modeFilter: ModeFilter): Promise<string[]> {
  if (modeFilter === "any" || gameIds.length === 0) return gameIds;

  const games = await prisma.game.findMany({ where: { id: { in: gameIds } } });
  const byId = await ensureGameModes(games);
  return gameIds.filter((id) => {
    const game = byId.get(id);
    return game ? matchesModeFilter(game, modeFilter) : false;
  });
}

/**
 * Sorteia um jogo entre tudo que o grupo tem marcado (interesse, favorito ou
 * possui, excluindo quem colocou na blacklist), ponderando o sorteio: jogos que
 * todo mundo tem marcado e favoritos pesam mais, mas o resultado continua
 * aleatório — não fica travado sempre no mesmo jogo só porque é o único em comum.
 */
export async function drawGame(
  userIds: string[],
  requireOwned = false,
  modeFilter: ModeFilter = "any",
): Promise<DrawResult> {
  const userGames = await prisma.userGame.findMany({
    where: {
      userId: { in: userIds },
      blacklisted: false,
      OR: [{ interested: true }, { favorite: true }, { owned: true }],
    },
  });

  const stats = new Map<
    string,
    { interested: Set<string>; favorite: Set<string>; owned: Set<string> }
  >();
  for (const ug of userGames) {
    const s = stats.get(ug.gameId) ?? {
      interested: new Set<string>(),
      favorite: new Set<string>(),
      owned: new Set<string>(),
    };
    if (ug.interested) s.interested.add(ug.userId);
    if (ug.favorite) s.favorite.add(ug.userId);
    if (ug.owned) s.owned.add(ug.userId);
    stats.set(ug.gameId, s);
  }

  let candidateIds = Array.from(stats.keys());

  if (requireOwned) {
    candidateIds = candidateIds.filter((id) => userIds.every((uid) => stats.get(id)!.owned.has(uid)));
  }

  candidateIds = await filterByMode(candidateIds, modeFilter);

  if (candidateIds.length === 0) {
    return { pickedGameId: null, pickedStats: null, candidateGameIds: [], fallback: [], fallbackUsed: true };
  }

  const entries = candidateIds.map((gameId) => {
    const s = stats.get(gameId)!;
    const interestedCount = s.interested.size;
    const favoriteCount = s.favorite.size;
    const commonToAll = interestedCount === userIds.length;

    // Peso: cresce com quantas pessoas têm o jogo (ao quadrado, pra premiar
    // consenso) e com favoritos, com um bônus extra pros que todo mundo tem —
    // mas sem zerar a chance dos demais.
    let weight = interestedCount * interestedCount + favoriteCount * userIds.length;
    if (commonToAll) weight *= 4;
    weight = Math.max(weight, 1);

    return {
      gameId,
      interestedCount,
      favoriteCount,
      commonToAll,
      weight,
      interestedUserIds: Array.from(s.interested),
      favoriteUserIds: Array.from(s.favorite),
      ownedUserIds: Array.from(s.owned),
    };
  });

  const picked = pickWeighted(entries);

  const fallback: FallbackEntry[] = entries
    .slice()
    .sort((a, b) => b.interestedCount + b.favoriteCount - (a.interestedCount + a.favoriteCount))
    .slice(0, 5)
    .map(({ gameId, interestedCount, favoriteCount, interestedUserIds, favoriteUserIds, ownedUserIds }) => ({
      gameId,
      interestedCount,
      favoriteCount,
      interestedUserIds,
      favoriteUserIds,
      ownedUserIds,
    }));

  const fullyCommonExists = entries.some((e) => e.commonToAll);

  return {
    pickedGameId: picked.gameId,
    pickedStats: {
      interestedUserIds: picked.interestedUserIds,
      favoriteUserIds: picked.favoriteUserIds,
      ownedUserIds: picked.ownedUserIds,
    },
    candidateGameIds: entries.map((e) => e.gameId),
    fallback,
    fallbackUsed: !fullyCommonExists,
  };
}
