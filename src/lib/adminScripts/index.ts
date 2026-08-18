import { prisma } from "@/lib/prisma";
import { syncGamePassCatalog } from "@/lib/gamepass/sync";
import { fetchSteamFeaturedGames, steamCoverUrl } from "@/lib/steam/client";

/**
 * Registro de scripts de manutenção rodáveis via POST /api/admin/run-script.
 * Cada entrada é nomeada e auto-contida — o endpoint só executa o que está
 * cadastrado aqui (nunca código arbitrário vindo da request), então adicionar
 * um script novo é só criar mais uma entrada neste objeto.
 */
export const ADMIN_SCRIPTS = {
  /** Reaplica o mesmo seed curado usado quando o baralho do /swipe esgota. */
  async "seed-swipe-pool"() {
    const featured = await fetchSteamFeaturedGames();
    const upserted = await Promise.all(
      featured.map((item) =>
        prisma.game.upsert({
          where: { steamAppId: item.id },
          create: {
            steamAppId: item.id,
            name: item.name,
            slug: `steam-${item.id}`,
            coverUrl: steamCoverUrl(item.id),
            discoverable: true,
          },
          update: { name: item.name, discoverable: true },
        }),
      ),
    );
    return { upserted: upserted.length };
  },

  /** Re-sincroniza o catálogo do Game Pass (mesma lógica do /api/admin/gamepass-sync). */
  async "gamepass-sync"() {
    return syncGamePassCatalog();
  },
} satisfies Record<string, () => Promise<unknown>>;

export type AdminScriptName = keyof typeof ADMIN_SCRIPTS;
