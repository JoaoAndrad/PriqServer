import { prisma } from "@/lib/prisma";
import { syncGamePassCatalog } from "@/lib/gamepass/sync";
import { fetchSteamFeaturedGames, resolveSteamCoverUrl, getSteamGameTags } from "@/lib/steam/client";
import { previewSteamLibrary, confirmSteamImport } from "@/lib/steam/import";
import { ensureGameModes } from "@/lib/games/modes";

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

  /** Lista usuários (id, username, displayName) — pra mapear nome -> conta antes de importar. */
  async "list-users"() {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true, steamId64: true },
      orderBy: { username: "asc" },
    });
    return { users };
  },

  /**
   * Importa a biblioteca da Steam de um perfil pra um usuário já existente
   * (mesma lógica de /api/import/steam, só que disparável sem UI). Marca os
   * jogos como `owned: true` (source: steam-import) e `discoverable: true`.
   * args: { username: string, steamProfile: string } — steamProfile aceita
   * steamId64, vanity URL ou o link completo do perfil.
   */
  async "import-steam-library"(args?: Record<string, unknown>) {
    const username = args?.username as string | undefined;
    const steamProfile = args?.steamProfile as string | undefined;
    if (!username || !steamProfile) {
      throw new Error("informe { username, steamProfile } em args");
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error(`usuário "${username}" não encontrado`);

    const preview = await previewSteamLibrary(steamProfile);
    await confirmSteamImport(
      user.id,
      preview.map((g) => g.gameId),
    );

    return { username, imported: preview.length, games: preview.map((g) => g.name) };
  },

  /**
   * Diagnóstico: mostra o que está salvo pra um jogo (por nome, match parcial)
   * e o que a Steam appdetails responde agora pro steamAppId dele — usado pra
   * entender por que gênero/descrição não apareceram (ex.: jogo sem página de
   * loja pública/delistado retorna tudo vazio, e isso fica cacheado como
   * "sem dado" permanentemente).
   */
  async "inspect-game"(args?: Record<string, unknown>) {
    const name = args?.name as string | undefined;
    if (!name) throw new Error("informe { name } em args");

    const games = await prisma.game.findMany({ where: { name: { contains: name } }, take: 10 });
    const liveTags = await Promise.all(
      games.map(async (g) => ({
        gameId: g.id,
        steamAppId: g.steamAppId,
        liveSteamTags: g.steamAppId ? await getSteamGameTags(g.steamAppId) : null,
      })),
    );

    return { games, liveTags };
  },

  /**
   * Reconserta jogos que ficaram com genres e/ou modes vazios — sintoma de
   * terem sido consultados durante uma rajada que bateu rate limit da Steam
   * appdetails (a resposta vinha success:false, tratada como "sem gênero
   * mesmo" e nunca mais reconsultada). Usa OR (não AND) porque um reparo
   * anterior pode ter corrigido só parte dos campos (ex.: description e
   * modes vieram certos numa tentativa, genres ficou "[]" por um bug à parte
   * — esse jogo não tem mais description:null pra bater num filtro com AND).
   * ensureGameModes só reprocessa jogos com modes===null, então resetamos
   * modes pra null nos suspeitos e deixamos ele (já com throttle) tentar de
   * novo.
   */
  async "repair-empty-game-details"() {
    const suspects = await prisma.game.findMany({
      where: { steamAppId: { not: null }, OR: [{ modes: "[]" }, { genres: "[]" }] },
    });
    if (suspects.length === 0) return { suspects: 0, repaired: 0 };

    await prisma.game.updateMany({
      where: { id: { in: suspects.map((g) => g.id) } },
      data: { modes: null },
    });

    const byId = await ensureGameModes(suspects.map((g) => ({ ...g, modes: null })));
    const repaired = Array.from(byId.values()).filter(
      (g) => g.modes !== "[]" || g.genres !== "[]" || g.description !== null,
    ).length;

    return { suspects: suspects.length, repaired };
  },

  /**
   * Reconsulta a Steam appdetails pra TODO jogo com steamAppId, mesmo os que
   * já têm modes/genres/description preenchidos — usado depois de trocar o
   * locale de "portuguese" (PT-PT na Steam) pra "brazilian" (PT-BR), que
   * fazia a short_description cair pro fallback em inglês sempre que o jogo
   * só tinha tradução PT-BR (a maioria). Processa em lotes pequenos com
   * intervalo (mesmo throttle do ensureGameModes) — pode demorar bastante
   * com um catálogo grande.
   */
  async "refresh-all-game-details"() {
    const games = await prisma.game.findMany({ where: { steamAppId: { not: null } } });
    if (games.length === 0) return { total: 0 };

    await prisma.game.updateMany({
      where: { id: { in: games.map((g) => g.id) } },
      data: { modes: null },
    });

    await ensureGameModes(games.map((g) => ({ ...g, modes: null })));

    // consulta o banco de novo em vez de confiar na contagem interna do
    // ensureGameModes — se ele parar cedo por rate limit, o Map devolvido
    // ainda contém todas as entradas de entrada (só que sem terem sido
    // atualizadas de verdade), o que mentia um "refreshed" igual ao total.
    const stillPending = await prisma.game.count({
      where: { id: { in: games.map((g) => g.id) }, modes: null },
    });
    return { total: games.length, done: games.length - stillPending, stillPending };
  },

  /**
   * Zera modes/genres/description de todo jogo com steamAppId, SEM apagar o
   * jogo em si nem bater na Steam agora — deixa repovoar aos poucos e
   * organicamente conforme /games, /draw e /swipe forem usados normalmente
   * (cada um já chama ensureGameModes/ensureGameDetails sob demanda, com o
   * throttle de ~1 req/s e parada automática em rate limit). Evita fazer uma
   * rajada de centenas de chamadas de uma vez só.
   */
  async "reset-game-details"() {
    const { count } = await prisma.game.updateMany({
      where: { steamAppId: { not: null } },
      data: { modes: null, genres: null, description: null },
    });
    return { reset: count };
  },
} satisfies Record<string, (args?: Record<string, unknown>) => Promise<unknown>>;

export type AdminScriptName = keyof typeof ADMIN_SCRIPTS;
