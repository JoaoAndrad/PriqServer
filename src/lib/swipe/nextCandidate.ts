import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { searchGames } from "@/lib/games/search";

// Termos-semente usados pra expandir o catálogo local quando acabam os
// candidatos elegíveis — cobre uma mistura de letras comuns e gêneros/temas
// populares, o suficiente pra puxar resultados variados da Steam/TheGamesDB.
const SEED_TERMS = [
  "a", "e", "i", "o", "u", "s", "r", "t",
  "war", "star", "simulator", "quest", "world", "legend", "hero", "dark",
  "adventure", "racing", "fighter", "puzzle", "survival", "tactics",
];

function randomSeedTerm(): string {
  return SEED_TERMS[crypto.randomInt(SEED_TERMS.length)];
}

/**
 * Escolhe um jogo aleatório do catálogo que o usuário ainda não avaliou
 * (nem like, nem deslike, nem blacklist). Se não sobrar nenhum localmente,
 * expande o catálogo com uma busca ao vivo (Steam + TheGamesDB) e tenta de novo.
 */
export async function getNextSwipeCandidate(userId: string) {
  const decided = await prisma.userGame.findMany({
    where: {
      userId,
      OR: [{ interested: true }, { dismissed: true }, { blacklisted: true }],
    },
    select: { gameId: true },
  });
  const decidedIds = decided.map((d) => d.gameId);

  const eligible = await prisma.game.findMany({
    where: { id: { notIn: decidedIds } },
  });

  if (eligible.length > 0) {
    return eligible[crypto.randomInt(eligible.length)];
  }

  // Baralho local esgotado — tenta trazer jogos novos pra dentro do cache.
  await searchGames(randomSeedTerm());

  const expanded = await prisma.game.findMany({
    where: { id: { notIn: decidedIds } },
  });

  if (expanded.length === 0) return null;
  return expanded[crypto.randomInt(expanded.length)];
}
