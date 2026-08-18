import { prisma } from "@/lib/prisma";
import { syncGamePassCatalog } from "@/lib/gamepass/sync";
import { fetchSteamFeaturedGames, resolveSteamCoverUrl } from "@/lib/steam/client";

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
      featured.map(async (item) => {
        // resolve sempre (não reaproveita coverUrl salva) — o caminho legado
        // (header.jpg) dá 404 bastante em jogos mais novos, e reaproveitar
        // uma capa quebrada salva anteriormente nunca corrigiria o problema.
        const coverUrl = await resolveSteamCoverUrl(item.id);
        return prisma.game.upsert({
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
    return { upserted: upserted.length };
  },

  /**
   * Backfill: marca `discoverable: true` pra qualquer jogo que já tenha
   * algum UserGame associado (favoritado, possuído, interessado ou
   * importado por alguém) — necessário porque a migration que introduziu o
   * campo marcou tudo como false por padrão, inclusive bibliotecas
   * existentes, tirando esses jogos do pool do /swipe.
   */
  async "backfill-discoverable-from-library"() {
    const { count } = await prisma.game.updateMany({
      where: { discoverable: false, users: { some: {} } },
      data: { discoverable: true },
    });
    return { updated: count };
  },

  /** Re-sincroniza o catálogo do Game Pass (mesma lógica do /api/admin/gamepass-sync). */
  async "gamepass-sync"() {
    return syncGamePassCatalog();
  },

  /**
   * Apaga jogos que só existem por terem aparecido numa busca livre — nunca
   * marcados `discoverable`, sem nenhuma flag de UserGame (ninguém interagiu)
   * e sem nenhum Recruitment apontando pra eles. Dry-run por padrão: só conta
   * e mostra uma amostra; passe { dryRun: false } no body pra apagar de verdade.
   */
  async "cleanup-search-cache"(args?: Record<string, unknown>) {
    const where = {
      discoverable: false,
      users: { none: {} },
      recruitments: { none: {} },
    } as const;

    const dryRun = args?.dryRun !== false;

    if (dryRun) {
      const count = await prisma.game.count({ where });
      const sample = await prisma.game.findMany({
        where,
        select: { id: true, name: true },
        take: 20,
      });
      return { dryRun: true, count, sample: sample.map((g) => g.name) };
    }

    const { count } = await prisma.game.deleteMany({ where });
    return { dryRun: false, deleted: count };
  },
} satisfies Record<string, (args?: Record<string, unknown>) => Promise<unknown>>;

export type AdminScriptName = keyof typeof ADMIN_SCRIPTS;
