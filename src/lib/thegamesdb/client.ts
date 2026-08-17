import { THEGAMESDB_API_KEY } from "@/lib/config";

const TGDB_BASE_URL = "https://api.thegamesdb.net/v1";

interface TgdbGame {
  id: number;
  game_title: string;
  release_date: string | null;
  platform: number;
}

interface TgdbBoxartImage {
  id: number;
  type: string;
  side: string;
  filename: string;
}

interface TgdbSearchResponse {
  data?: { games?: TgdbGame[] };
  include?: {
    boxart?: {
      base_url?: { medium?: string; original?: string };
      data?: Record<string, TgdbBoxartImage[]>;
    };
  };
}

export interface TgdbGameResult {
  id: number;
  title: string;
  coverUrl: string | null;
  released: string | null;
}

function extractResults(data: TgdbSearchResponse): TgdbGameResult[] {
  const games = data.data?.games ?? [];
  const boxartBase = data.include?.boxart?.base_url?.medium ?? data.include?.boxart?.base_url?.original;
  const boxartData = data.include?.boxart?.data ?? {};

  return games.map((game) => {
    const images = boxartData[String(game.id)] ?? [];
    const front = images.find((img) => img.side === "front") ?? images[0];
    const coverUrl = front && boxartBase ? `${boxartBase}${front.filename}` : null;

    return {
      id: game.id,
      title: game.game_title,
      coverUrl,
      released: game.release_date,
    };
  });
}

/**
 * Cliente para a TheGamesDB (api.thegamesdb.net). Requer THEGAMESDB_API_KEY
 * (chave de aprovação manual — https://thegamesdb.net/member/api/). Nunca
 * derruba a aplicação se a API estiver indisponível ou sem chave configurada.
 */
export async function searchTgdbGames(query: string): Promise<TgdbGameResult[]> {
  if (!THEGAMESDB_API_KEY) {
    console.warn("THEGAMESDB_API_KEY não configurada — busca externa desabilitada.");
    return [];
  }

  const url = new URL(`${TGDB_BASE_URL}/Games/ByGameName`);
  url.searchParams.set("apikey", THEGAMESDB_API_KEY);
  url.searchParams.set("name", query);
  url.searchParams.set("include", "boxart");

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error("Falha na busca TheGamesDB:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as TgdbSearchResponse;
    return extractResults(data);
  } catch (err) {
    console.error("Erro ao consultar TheGamesDB:", err);
    return [];
  }
}

export async function getTgdbGameById(tgdbId: number): Promise<TgdbGameResult | null> {
  if (!THEGAMESDB_API_KEY) return null;

  const url = new URL(`${TGDB_BASE_URL}/Games/ByGameID`);
  url.searchParams.set("apikey", THEGAMESDB_API_KEY);
  url.searchParams.set("id", String(tgdbId));
  url.searchParams.set("include", "boxart");

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as TgdbSearchResponse;
    return extractResults(data)[0] ?? null;
  } catch (err) {
    console.error("Erro ao consultar TheGamesDB:", err);
    return null;
  }
}
