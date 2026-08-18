import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getNextSwipeCandidate } from "@/lib/swipe/nextCandidate";
import { ensureGameDetails } from "@/lib/games/modes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const candidate = await getNextSwipeCandidate(user.id);
  if (!candidate) return NextResponse.json({ game: null });

  // gênero/descrição são buscados sob demanda na Steam só na primeira vez
  // que o jogo aparece — não trava a busca inicial nem bate na API de novo
  // depois que já tá em cache.
  const game = await ensureGameDetails(candidate);

  // "owned" não entra em decidedIds (só interested/dismissed/blacklisted tiram
  // do baralho) — então um jogo que alguém do grupo já possui pode aparecer
  // no swipe de outra pessoa normalmente, só avisamos que já tem dono.
  const ownedByOthers =
    (await prisma.userGame.count({ where: { gameId: game.id, owned: true } })) > 0;

  return NextResponse.json({ game, ownedByOthers });
}
