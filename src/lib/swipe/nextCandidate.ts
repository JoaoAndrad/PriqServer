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

/**
 * Escolhe um jogo aleatório do catálogo, marcado como `discoverable`, que o
 * usuário ainda não avaliou (nem like, nem deslike, nem blacklist). Se não
 * sobrar nenhum, tenta reabastecer o pool com jogos em destaque na Steam e
 * tenta de novo.
 */
export async function getNextSwipeCandidate(userId: string) {
  const decided = await prisma.userGame.findMany({
    where: {
      userId,
      OR: [{ interested: true }, { dismissed: true }, { blacklisted: true }],
    },
    select: { gameId: true },
  });
  const decidedIds = decided.map((d) => d.gameId);

  const eligible = await prisma.game.findMany({
    where: { discoverable: true, id: { notIn: decidedIds } },
  });

  if (eligible.length > 0) {
    return eligible[crypto.randomInt(eligible.length)];
  }

  // Baralho local esgotado — tenta trazer jogos em destaque novos pra dentro do pool.
  await expandDiscoverablePool();

  const expanded = await prisma.game.findMany({
    where: { discoverable: true, id: { notIn: decidedIds } },
  });

  if (expanded.length === 0) return null;
  return expanded[crypto.randomInt(expanded.length)];
}
