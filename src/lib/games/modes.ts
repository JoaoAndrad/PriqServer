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

/**
 * Garante que `modes`/`genres`/`description` estejam populados (via Steam)
 * pros jogos informados que ainda não têm esse dado no cache. Só jogos com
 * steamAppId são resolvíveis — jogos só da TheGamesDB ficam sem modo/descrição
 * (nunca batem em filtro online/co-op, e não mostram descrição no /swipe).
 */
export async function ensureGameModes(games: Game[]): Promise<Map<string, Game>> {
  const byId = new Map(games.map((g) => [g.id, g]));
  const missing = games.filter((g) => g.modes === null && g.steamAppId !== null);

  if (missing.length > 0) {
    const updated = await Promise.all(
      missing.map(async (g) => {
        const tags = await getSteamGameTags(g.steamAppId!);
        return prisma.game.update({
          where: { id: g.id },
          data: {
            modes: JSON.stringify(tags.modes),
            genres: g.genres ?? JSON.stringify(tags.genres),
            description: g.description ?? tags.description,
          },
        });
      }),
    );
    for (const g of updated) byId.set(g.id, g);
  }

  return byId;
}

/** Mesma lógica de ensureGameModes, mas pra um único jogo — usado no /api/swipe/next. */
export async function ensureGameDetails(game: Game): Promise<Game> {
  const byId = await ensureGameModes([game]);
  return byId.get(game.id) ?? game;
}
