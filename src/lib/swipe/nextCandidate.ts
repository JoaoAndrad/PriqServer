import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchSteamFeaturedGames, resolveSteamCoverUrl } from "@/lib/steam/client";

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

/**
 * Escolhe até `count` jogos aleatórios e distintos do catálogo, marcados
 * como `discoverable`, que o usuário ainda não avaliou (nem like, nem
 * deslike, nem blacklist) e que não estejam em `excludeIds` (usado pelo
 * front pra não repetir jogo que já está na fila local de swipe). Se não
 * sobrar o suficiente, tenta reabastecer o pool com jogos em destaque na
 * Steam e tenta de novo.
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
  const exclude = [...decided.map((d) => d.gameId), ...excludeIds];

  let eligible = await prisma.game.findMany({
    where: { discoverable: true, id: { notIn: exclude } },
  });

  if (eligible.length < count) {
    // Baralho local esgotado (ou perto disso) — tenta trazer jogos em
    // destaque novos pra dentro do pool antes de desistir.
    await expandDiscoverablePool();
    eligible = await prisma.game.findMany({
      where: { discoverable: true, id: { notIn: exclude } },
    });
  }

  return shuffle(eligible).slice(0, count);
}
