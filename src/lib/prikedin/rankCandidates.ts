import { prisma } from "@/lib/prisma";

export interface RankedCandidate {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  tier: "favorite" | "interested" | "other" | "none";
}

const TIER_ORDER: Record<RankedCandidate["tier"], number> = {
  favorite: 0,
  interested: 1,
  other: 2,
  none: 3,
};

/**
 * Ranking de candidatos pra uma vaga de um jogo: favorito > interesse > possui > demais,
 * excluindo quem tem o jogo na blacklist. Todo mundo pode ser convidado, mesmo quem
 * nunca marcou o jogo (tier "none") — só quem colocou o jogo na blacklist fica de fora.
 */
export async function rankCandidates(
  gameId: string,
  excludeUserId: string,
): Promise<RankedCandidate[]> {
  const [users, userGames] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: excludeUserId } },
      select: { id: true, displayName: true, avatarPath: true },
    }),
    prisma.userGame.findMany({
      where: { gameId, userId: { not: excludeUserId } },
      select: { userId: true, interested: true, favorite: true, blacklisted: true },
    }),
  ]);

  const byUserId = new Map(userGames.map((ug) => [ug.userId, ug]));

  const candidates: RankedCandidate[] = users
    .filter((u) => !byUserId.get(u.id)?.blacklisted)
    .map((u) => {
      const ug = byUserId.get(u.id);
      const tier: RankedCandidate["tier"] = !ug
        ? "none"
        : ug.favorite
          ? "favorite"
          : ug.interested
            ? "interested"
            : "other";
      return { userId: u.id, displayName: u.displayName, avatarPath: u.avatarPath, tier };
    });

  return candidates.sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.displayName.localeCompare(b.displayName),
  );
}
