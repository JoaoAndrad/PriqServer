import { prisma } from "@/lib/prisma";
import { fetchGamePassCatalog } from "./client";

/**
 * Sincroniza a flag `onGamePass` nos jogos já cacheados, casando por nome.
 * Não cria jogos novos automaticamente — evita poluir o catálogo com entradas
 * que ninguém buscou/marcou ainda. Best-effort: se a API estiver fora do ar,
 * apenas não atualiza nada (não derruba a aplicação).
 */
export async function syncGamePassCatalog(): Promise<{ matched: number; total: number }> {
  const catalog = await fetchGamePassCatalog();
  if (catalog.length === 0) return { matched: 0, total: 0 };

  const titles = catalog.map((item) => item.title.toLowerCase());

  const existingGames = await prisma.game.findMany();
  const now = new Date();

  let matched = 0;
  for (const game of existingGames) {
    const isOnGamePass = titles.some(
      (title) => title === game.name.toLowerCase() || title.includes(game.name.toLowerCase()),
    );
    if (isOnGamePass !== game.onGamePass || isOnGamePass) {
      await prisma.game.update({
        where: { id: game.id },
        data: { onGamePass: isOnGamePass, gamePassSyncedAt: now },
      });
      if (isOnGamePass) matched += 1;
    }
  }

  return { matched, total: catalog.length };
}
