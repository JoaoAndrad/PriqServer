import { prisma } from "@/lib/prisma";
import { searchSteamStore, steamCoverUrl } from "@/lib/steam/client";
import { searchTgdbGames, getTgdbGameById } from "@/lib/thegamesdb/client";
import { mapTgdbToGameData } from "@/lib/thegamesdb/mapper";
import { THEGAMESDB_API_KEY } from "@/lib/config";

/**
 * Busca de jogos combinando três camadas, sempre nessa ordem:
 * 1. Cache local (SQLite) — instantâneo, não depende de nenhuma API externa.
 *    Qualquer resultado local já é considerado "cache válido" — não faz sentido
 *    bater na API externa de novo só porque a busca teve poucos resultados
 *    (ex.: um jogo específico como "Valorant" nunca teria 5+ correspondências).
 * 2. Steam Store Search e 3. TheGamesDB (se THEGAMESDB_API_KEY estiver configurada)
 *    são consultadas em paralelo e mescladas — a Steam não vende tudo (jogos
 *    F2P fora da loja, tipo League of Legends, nunca aparecem lá), então não dá
 *    pra tratar TheGamesDB como fallback só-se-Steam-vier-vazia: um resultado
 *    parecido na Steam não pode calar o jogo certo que só existe na TheGamesDB.
 * Nenhuma falha de API externa derruba a aplicação — sempre cai pro que já
 * está disponível.
 *
 * Buscas com menos de 3 letras não vão pras APIs externas (só cache local),
 * pra evitar bater nelas a cada tecla digitada com termos pouco úteis.
 */
export async function searchGames(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const local = await prisma.game.findMany({
    where: { name: { contains: trimmed } },
    take: 20,
  });

  if (local.length > 0) {
    console.log(`[games/search] "${trimmed}" -> cache (${local.length})`);
    return local;
  }

  if (trimmed.length < 3) {
    return local;
  }

  const byId = new Map(local.map((g) => [g.id, g]));

  const [steamResults, tgdbResults] = await Promise.all([
    searchSteamStore(trimmed),
    THEGAMESDB_API_KEY ? searchTgdbGames(trimmed) : Promise.resolve([]),
  ]);

  const steamUpserted = await Promise.all(
    steamResults.map((item) =>
      prisma.game.upsert({
        where: { steamAppId: item.id },
        create: {
          steamAppId: item.id,
          name: item.name,
          slug: `steam-${item.id}`,
          coverUrl: steamCoverUrl(item.id),
          refreshedAt: new Date(),
        },
        update: { name: item.name, refreshedAt: new Date() },
      }),
    ),
  );
  for (const game of steamUpserted) byId.set(game.id, game);
  if (steamUpserted.length > 0) {
    console.log(`[games/search] "${trimmed}" -> steam (${steamUpserted.length})`);
  }

  const tgdbUpserted = await Promise.all(
    tgdbResults.map((tgdb) =>
      prisma.game.upsert({
        where: { tgdbId: tgdb.id },
        create: mapTgdbToGameData(tgdb),
        update: mapTgdbToGameData(tgdb),
      }),
    ),
  );
  for (const game of tgdbUpserted) byId.set(game.id, game);
  if (tgdbUpserted.length > 0) {
    console.log(`[games/search] "${trimmed}" -> thegamesdb (${tgdbUpserted.length})`);
  }

  if (byId.size === 0) {
    console.log(`[games/search] "${trimmed}" -> nenhum resultado`);
  }

  return Array.from(byId.values());
}

/** Garante que um jogo (por steamAppId) exista no cache local, buscando na Steam se necessário. */
export async function ensureGameBySteamAppId(steamAppId: number) {
  const existing = await prisma.game.findUnique({ where: { steamAppId } });
  if (existing) return existing;

  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(steamAppId));
  url.searchParams.set("l", "portuguese");

  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao consultar detalhes do jogo na Steam");

  const data = await res.json();
  const entry = data?.[String(steamAppId)];
  if (!entry?.success) throw new Error("Jogo não encontrado na Steam");

  const name: string = entry.data.name;

  return prisma.game.upsert({
    where: { steamAppId },
    create: {
      steamAppId,
      name,
      slug: `steam-${steamAppId}`,
      coverUrl: steamCoverUrl(steamAppId),
    },
    update: { name },
  });
}

/** Garante que um jogo (por tgdbId) exista no cache local, buscando na TheGamesDB se necessário. */
export async function ensureGameByTgdbId(tgdbId: number) {
  const existing = await prisma.game.findUnique({ where: { tgdbId } });
  if (existing) return existing;

  const tgdb = await getTgdbGameById(tgdbId);
  if (!tgdb) throw new Error("Jogo não encontrado na TheGamesDB");

  return prisma.game.upsert({
    where: { tgdbId },
    create: mapTgdbToGameData(tgdb),
    update: mapTgdbToGameData(tgdb),
  });
}
