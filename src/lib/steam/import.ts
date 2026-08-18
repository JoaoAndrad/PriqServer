import { prisma } from "@/lib/prisma";
import { getOwnedGames, resolveSteamCoverUrl, resolveSteamId64 } from "./client";

export interface SteamPreviewItem {
  gameId: string;
  name: string;
  coverUrl: string | null;
  playtimeHours: number;
}

/** Busca a biblioteca da Steam e garante cada jogo no cache local (Game), sem tocar em UserGame ainda. */
export async function previewSteamLibrary(steamProfileInput: string): Promise<SteamPreviewItem[]> {
  const steamId64 = await resolveSteamId64(steamProfileInput);
  const ownedGames = await getOwnedGames(steamId64);

  const results: SteamPreviewItem[] = [];

  for (const owned of ownedGames) {
    // o appid da Steam já identifica o jogo exatamente — sem precisar casar por nome.
    const existing = await prisma.game.findUnique({ where: { steamAppId: owned.appid } });

    // só resolve a capa de novo se o jogo é novo ou ainda não tem capa
    // (evita bater na API da Steam de novo pra jogos que já foram resolvidos).
    const coverUrl = existing?.coverUrl ?? (await resolveSteamCoverUrl(owned.appid));

    const game = await prisma.game.upsert({
      where: { steamAppId: owned.appid },
      create: {
        steamAppId: owned.appid,
        name: owned.name,
        slug: `steam-${owned.appid}`,
        coverUrl,
      },
      update: { name: owned.name, coverUrl },
    });

    results.push({
      gameId: game.id,
      name: game.name,
      coverUrl: game.coverUrl,
      playtimeHours: Math.round((owned.playtime_forever / 60) * 10) / 10,
    });
  }

  return results.sort((a, b) => b.playtimeHours - a.playtimeHours);
}

/** Confirma a importação: marca os gameIds selecionados como "possui" (source: steam-import). */
export async function confirmSteamImport(userId: string, gameIds: string[]) {
  await prisma.$transaction([
    ...gameIds.map((gameId) =>
      prisma.userGame.upsert({
        where: { userId_gameId: { userId, gameId } },
        create: { userId, gameId, owned: true, source: "steam-import" },
        update: { owned: true },
      }),
    ),
    // confirmado pelo usuário (não só previsto no preview) — vira elegível pro /swipe
    prisma.game.updateMany({ where: { id: { in: gameIds } }, data: { discoverable: true } }),
  ]);
}
