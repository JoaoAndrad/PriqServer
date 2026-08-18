import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getNextSwipeCandidates } from "@/lib/swipe/nextCandidate";
import { ensureGameDetails } from "@/lib/games/modes";

const MAX_COUNT = 5;

/**
 * Retorna até `count` candidatos de uma vez (?count=5), excluindo
 * `?exclude=id1,id2` — usado pelo front pra montar/repor a fila local de
 * swipe sem esperar uma ida-e-volta por card e sem repetir o que já está
 * na fila.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const count = Math.min(Math.max(Number(searchParams.get("count")) || 1, 1), MAX_COUNT);
  const excludeIds = (searchParams.get("exclude") ?? "").split(",").filter(Boolean);

  const candidates = await getNextSwipeCandidates(user.id, count, excludeIds);

  const games = await Promise.all(
    candidates.map(async (candidate) => {
      // gênero/descrição são buscados sob demanda na Steam só na primeira vez
      // que o jogo aparece — não trava a busca inicial nem bate na API de
      // novo depois que já tá em cache.
      const game = await ensureGameDetails(candidate);

      // "owned" não entra na exclusão de decididos (só interested/dismissed/
      // blacklisted tiram do baralho) — então um jogo que alguém do grupo já
      // possui pode aparecer no swipe de outra pessoa, só avisamos que já
      // tem dono.
      const ownedByOthers =
        (await prisma.userGame.count({ where: { gameId: game.id, owned: true } })) > 0;

      return { game, ownedByOthers };
    }),
  );

  return NextResponse.json({ games });
}
