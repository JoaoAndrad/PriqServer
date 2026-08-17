import { prisma } from "@/lib/prisma";

export interface RankedCandidate {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  tier: "favorite" | "interested" | "other";
}

const TIER_ORDER: Record<RankedCandidate["tier"], number> = {
  favorite: 0,
  interested: 1,
  other: 2,
};

/**
 * Ranking de candidatos pra uma vaga de um jogo: favorito > interesse > demais,
 * excluindo quem tem o jogo na blacklist.
 */
export async function rankCandidates(
  gameId: string,
  excludeUserId: string,
): Promise<RankedCandidate[]> {
  const userGames = await prisma.userGame.findMany({
    where: { gameId, userId: { not: excludeUserId }, blacklisted: false },
    include: { user: { select: { id: true, displayName: true, avatarPath: true } } },
  });

  const candidates: RankedCandidate[] = userGames.map((ug) => ({
    userId: ug.user.id,
    displayName: ug.user.displayName,
    avatarPath: ug.user.avatarPath,
    tier: ug.favorite ? "favorite" : ug.interested ? "interested" : "other",
  }));

  return candidates.sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.displayName.localeCompare(b.displayName),
  );
}
