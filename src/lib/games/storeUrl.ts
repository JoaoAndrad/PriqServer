import type { GameDTO } from "@/types";

/**
 * Link pra página de compra do jogo. Steam quando o jogo tem steamAppId
 * (é o caso mais comum); senão, cai pra página do jogo na TheGamesDB — não é
 * bem uma "loja", mas é o melhor destino que temos pra jogo fora da Steam
 * (ex.: retrô/console). Sem nenhum dos dois ids, não tem link.
 */
export function gameStoreUrl(game: Pick<GameDTO, "steamAppId" | "tgdbId">): string | null {
  if (game.steamAppId) return `https://store.steampowered.com/app/${game.steamAppId}`;
  if (game.tgdbId) return `https://thegamesdb.net/game.php?id=${game.tgdbId}`;
  return null;
}
