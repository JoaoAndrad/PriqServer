import type { Game } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSteamGameTags } from "@/lib/steam/client";

export type ModeFilter = "any" | "online" | "coop";

const ONLINE_CATEGORIES = ["Multiplayer", "PvP", "Online PvP", "Online Co-op", "Co-op", "MMO"];
const COOP_CATEGORIES = ["Co-op", "Online Co-op", "Local Co-op", "Shared/Split Screen Co-op"];

function parseModes(game: Pick<Game, "modes">): string[] {
  if (!game.modes) return [];
  try {
    return JSON.parse(game.modes) as string[];
  } catch {
    return [];
  }
}

export function matchesModeFilter(game: Pick<Game, "modes">, filter: ModeFilter): boolean {
  if (filter === "any") return true;
  const modes = parseModes(game);
  const wanted = filter === "online" ? ONLINE_CATEGORIES : COOP_CATEGORIES;
  return modes.some((m) => wanted.includes(m));
}

// 1 por vez com um intervalo de ~1s — 3 por lote a cada 400ms ainda batia no
// rate limit da Steam appdetails em lotes grandes (ex.: refresh de 300+ jogos).
const APPDETAILS_BATCH_SIZE = 1;
const APPDETAILS_BATCH_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Garante que `modes`/`genres`/`description` estejam populados (via Steam)
 * pros jogos informados que ainda não têm esse dado no cache. Só jogos com
 * steamAppId são resolvíveis — jogos só da TheGamesDB ficam sem modo/descrição
 * (nunca batem em filtro online/co-op, e não mostram descrição no /swipe).
 *
 * Processa em lotes pequenos com um intervalo entre eles — disparar dezenas
 * de chamadas simultâneas pra appdetails (ex.: ao importar uma lib grande da
 * Steam) faz a API responder success:false por rate limit, e como isso ficava
 * cacheado como "sem gênero/descrição" pra sempre, o jogo nunca mais tentava
 * de novo mesmo com a API disponível de novo.
 */
export async function ensureGameModes(games: Game[]): Promise<Map<string, Game>> {
  const byId = new Map(games.map((g) => [g.id, g]));
  const missing = games.filter((g) => g.modes === null && g.steamAppId !== null);

  for (let i = 0; i < missing.length; i += APPDETAILS_BATCH_SIZE) {
    const batch = missing.slice(i, i + APPDETAILS_BATCH_SIZE);
    const updated = await Promise.all(
      batch.map(async (g) => {
        const tags = await getSteamGameTags(g.steamAppId!);
        return prisma.game.update({
          where: { id: g.id },
          data: {
            // `missing` já filtra por modes===null (nunca resolvido/precisa
            // reconsultar), então sobrescreve tudo direto — usar `g.genres ??`
            // aqui deixava "[]" (string vazia, não null) travado pra sempre,
            // já que "[]" passa no ?? e nunca era substituído pelo dado novo.
            modes: JSON.stringify(tags.modes),
            genres: JSON.stringify(tags.genres),
            description: tags.description,
          },
        });
      }),
    );
    for (const g of updated) byId.set(g.id, g);

    if (i + APPDETAILS_BATCH_SIZE < missing.length) {
      await sleep(APPDETAILS_BATCH_DELAY_MS);
    }
  }

  return byId;
}

/** Mesma lógica de ensureGameModes, mas pra um único jogo — usado no /api/swipe/next. */
export async function ensureGameDetails(game: Game): Promise<Game> {
  const byId = await ensureGameModes([game]);
  return byId.get(game.id) ?? game;
}
