import { STEAM_API_KEY } from "@/lib/config";

const STEAM_BASE_URL = "https://api.steampowered.com";

export interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
}

export class SteamImportError extends Error {}

function steamCoverUrl(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

/**
 * Resolve a capa do jogo. Jogos mais novos não têm mais `header.jpg` no
 * caminho estático legado (`cdn.cloudflare.steamstatic.com/steam/apps/{id}/...`)
 * — a Steam passou a versionar esses assets com hash em
 * `shared.akamai.steamstatic.com/store_item_assets/...`, então o caminho
 * legado responde 404 mesmo com o appid correto. Confere o legado primeiro
 * (rápido, sem limite de taxa) e só cai pra API de detalhes da loja quando
 * ele falhar.
 */
export async function resolveSteamCoverUrl(appid: number): Promise<string | null> {
  const legacyUrl = steamCoverUrl(appid);
  try {
    const head = await fetch(legacyUrl, { method: "HEAD" });
    if (head.ok) return legacyUrl;
  } catch {
    // ignora e tenta o fallback abaixo
  }

  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appid));
    url.searchParams.set("cc", "us");
    url.searchParams.set("l", "english");

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data?.[String(appid)];
    if (!entry?.success) return null;

    return (entry.data?.header_image as string | undefined) ?? null;
  } catch (err) {
    console.error(`Erro ao resolver capa da Steam para appid ${appid}:`, err);
    return null;
  }
}

/** Aceita um steamId64 direto (17 dígitos) ou uma vanity URL/nome de perfil, resolvendo se necessário. */
export async function resolveSteamId64(input: string): Promise<string> {
  const trimmed = input.trim();
  if (/^\d{17}$/.test(trimmed)) return trimmed;

  if (!STEAM_API_KEY) {
    throw new SteamImportError("STEAM_API_KEY não configurada.");
  }

  // aceita também uma URL completa tipo steamcommunity.com/id/nome ou
  // steamcommunity.com/profiles/<steamid64> — esse segundo caso já vem com o
  // id pronto depois de tirar o prefixo, sem precisar resolver vanity nenhuma.
  const vanity = trimmed.replace(/^https?:\/\/(www\.)?steamcommunity\.com\/(id|profiles)\//, "").replace(/\/$/, "");
  if (/^\d{17}$/.test(vanity)) return vanity;

  const url = new URL(`${STEAM_BASE_URL}/ISteamUser/ResolveVanityURL/v0001/`);
  url.searchParams.set("key", STEAM_API_KEY);
  url.searchParams.set("vanityurl", vanity);

  const res = await fetch(url);
  if (!res.ok) throw new SteamImportError("Falha ao consultar a Steam.");

  const data = await res.json();
  if (data?.response?.success !== 1) {
    throw new SteamImportError("Perfil da Steam não encontrado.");
  }

  return data.response.steamid as string;
}

export async function getOwnedGames(steamId64: string): Promise<SteamOwnedGame[]> {
  if (!STEAM_API_KEY) {
    throw new SteamImportError("STEAM_API_KEY não configurada.");
  }

  const url = new URL(`${STEAM_BASE_URL}/IPlayerService/GetOwnedGames/v0001/`);
  url.searchParams.set("key", STEAM_API_KEY);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("format", "json");
  url.searchParams.set("include_appinfo", "true");

  const res = await fetch(url);
  if (!res.ok) throw new SteamImportError("Falha ao consultar a biblioteca da Steam.");

  const data = await res.json();
  const games = data?.response?.games;
  if (!Array.isArray(games)) {
    throw new SteamImportError(
      "Não foi possível ler a biblioteca — o perfil e os detalhes do jogo precisam estar públicos na Steam.",
    );
  }

  return games.map((g: { appid: number; name: string; playtime_forever: number }) => ({
    appid: g.appid,
    name: g.name,
    playtime_forever: g.playtime_forever,
  }));
}

export { steamCoverUrl };

export interface SteamFeaturedItem {
  id: number;
  name: string;
}

/**
 * Lista jogos em destaque na loja da Steam (mais vendidos, lançamentos, promoções)
 * — endpoint público, sem chave. Usado pra reabastecer o pool do /swipe com jogos
 * curados de verdade, em vez de bater com termos genéricos ("war", "quest", etc.)
 * que trazem qualquer coisa que combine por acaso.
 */
export async function fetchSteamFeaturedGames(): Promise<SteamFeaturedItem[]> {
  const url = new URL("https://store.steampowered.com/api/featuredcategories");
  url.searchParams.set("cc", "BR");
  url.searchParams.set("l", "portuguese");

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();

    const buckets = ["top_sellers", "new_releases", "specials"] as const;
    const byId = new Map<number, string>();
    for (const bucket of buckets) {
      const items = data?.[bucket]?.items as { id?: number; name?: string }[] | undefined;
      for (const item of items ?? []) {
        if (item.id && item.name) byId.set(item.id, item.name);
      }
    }

    return Array.from(byId, ([id, name]) => ({ id, name }));
  } catch (err) {
    console.error("Erro ao consultar featuredcategories da Steam:", err);
    return [];
  }
}

export interface SteamGameTags {
  genres: string[];
  modes: string[]; // categories da Steam (Multiplayer, Co-op, Online Co-op, etc.)
  description: string | null; // short_description, já em português (l=portuguese)
}

/**
 * Busca genres/categories/descrição curta de um app na Steam Store
 * (appdetails). Usado pra classificar modo de jogo (online/co-op), gênero e
 * mostrar uma descrição no /swipe. Nunca derruba a aplicação se a Steam
 * estiver fora do ar — retorna vazio nesse caso.
 */
export async function getSteamGameTags(appid: number): Promise<SteamGameTags> {
  const empty = { genres: [], modes: [], description: null };
  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appid));
    url.searchParams.set("l", "portuguese");
    url.searchParams.set("cc", "BR");

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return empty;

    const data = await res.json();
    const entry = data?.[String(appid)];
    if (!entry?.success) return empty;

    const genres = (entry.data?.genres ?? []).map((g: { description: string }) => g.description);
    const modes = (entry.data?.categories ?? []).map((c: { description: string }) => c.description);
    const description = (entry.data?.short_description as string | undefined)?.trim() || null;
    return { genres, modes, description };
  } catch (err) {
    console.error(`Erro ao consultar tags da Steam para appid ${appid}:`, err);
    return empty;
  }
}

export interface SteamStoreSearchItem {
  id: number;
  name: string;
}

/**
 * Busca na Steam Store (endpoint público não-oficial usado pelo buscador da
 * própria loja) — não precisa de STEAM_API_KEY nem de chave nenhuma. Nunca
 * derruba a aplicação se a Steam estiver fora do ar.
 */
export async function searchSteamStore(query: string): Promise<SteamStoreSearchItem[]> {
  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", query);
  url.searchParams.set("l", "portuguese");
  url.searchParams.set("cc", "BR");

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { id: number; name: string; type: string }[] };
    return (data.items ?? [])
      .filter((item) => item.type === "app")
      .map((item) => ({ id: item.id, name: item.name }));
  } catch (err) {
    console.error("Erro ao consultar Steam Store Search:", err);
    return [];
  }
}
