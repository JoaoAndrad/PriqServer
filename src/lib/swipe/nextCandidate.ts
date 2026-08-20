import crypto from "node:crypto";
import type { Game } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchSteamFeaturedGames, resolveSteamCoverUrl } from "@/lib/steam/client";
import { ensureGameModes, matchesModeFilter } from "@/lib/games/modes";

/**
 * Reabastece o pool do /swipe com jogos curados (mais vendidos, lançamentos,
 * promoções da Steam) marcados como `discoverable`. Só jogos com essa flag
 * entram no swipe — busca livre (achar um jogo específico pra adicionar à
 * lista) não deve poluir o pool de descoberta sozinha, só ação explícita do
 * usuário (favoritar, marcar como possuído, importar da Steam) ou esse seed.
 */
async function expandDiscoverablePool() {
  const featured = await fetchSteamFeaturedGames();
  if (featured.length === 0) return;

  await Promise.all(
    featured.map(async (item) => {
      // resolve sempre (não reaproveita coverUrl salva) — o caminho legado
      // (header.jpg) dá 404 bastante em jogos mais novos, e reaproveitar uma
      // capa quebrada salva anteriormente nunca corrigiria o problema.
      const coverUrl = await resolveSteamCoverUrl(item.id);

      await prisma.game.upsert({
        where: { steamAppId: item.id },
        create: {
          steamAppId: item.id,
          name: item.name,
          slug: `steam-${item.id}`,
          coverUrl,
          discoverable: true,
        },
        update: { name: item.name, coverUrl, discoverable: true },
      });
    }),
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isOnlineOrCoop(game: Pick<Game, "modes">): boolean {
  return matchesModeFilter(game, "online") || matchesModeFilter(game, "coop");
}

// Teto de jogos verificados por chamada: jogos sem `modes` em cache custam
// uma ida à Steam (~1s cada, ver ensureGameModes) pra descobrir se são
// online/coop, então um lote grande estouraria o tempo de resposta do
// /swipe. O que não couber aqui só é considerado numa próxima chamada
// (repõe a fila local aos poucos), e o refresh em background eventualmente
// preenche o cache pro resto do catálogo.
const MAX_CHECKED_PER_CALL = 20;

/**
 * Escolhe até `count` jogos aleatórios e distintos do catálogo, marcados
 * como `discoverable`, do tipo online ou cooperativo, que o usuário ainda
 * não avaliou (nem like, nem deslike, nem blacklist) e que não estejam em
 * `excludeIds` (usado pelo front pra não repetir jogo que já está na fila
 * local de swipe). Se não sobrar o suficiente, tenta reabastecer o pool com
 * jogos em destaque na Steam e tenta de novo.
 */
export async function getNextSwipeCandidates(
  userId: string,
  count: number,
  excludeIds: string[] = [],
) {
  const decided = await prisma.userGame.findMany({
    where: {
      userId,
      OR: [{ interested: true }, { dismissed: true }, { blacklisted: true }],
    },
    select: { gameId: true },
  });
  const exclude = new Set([...decided.map((d) => d.gameId), ...excludeIds]);

  const selected: Game[] = [];
  const checked = new Set<string>();
  let expanded = false;

  while (selected.length < count && checked.size < MAX_CHECKED_PER_CALL) {
    const eligible = await prisma.game.findMany({
      where: {
        discoverable: true,
        id: { notIn: [...exclude, ...checked, ...selected.map((g) => g.id)] },
      },
    });

    if (eligible.length === 0) {
      if (expanded) break;
      // Baralho local esgotado — tenta trazer jogos em destaque novos pra
      // dentro do pool antes de desistir.
      expanded = true;
      await expandDiscoverablePool();
      continue;
    }

    const batch = shuffle(eligible).slice(0, MAX_CHECKED_PER_CALL - checked.size);
    const withModes = await ensureGameModes(batch);

    for (const game of batch) {
      checked.add(game.id);
      const resolved = withModes.get(game.id) ?? game;
      if (isOnlineOrCoop(resolved)) {
        selected.push(resolved);
        if (selected.length >= count) break;
      }
    }
  }

  return selected.slice(0, count);
}
