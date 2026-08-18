import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getNextSwipeCandidate } from "@/lib/swipe/nextCandidate";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const game = await getNextSwipeCandidate(user.id);
  if (!game) return NextResponse.json({ game: null });

  // "owned" não entra em decidedIds (só interested/dismissed/blacklisted tiram
  // do baralho) — então um jogo que alguém do grupo já possui pode aparecer
  // no swipe de outra pessoa normalmente, só avisamos que já tem dono.
  const ownedByOthers =
    (await prisma.userGame.count({ where: { gameId: game.id, owned: true } })) > 0;

  return NextResponse.json({ game, ownedByOthers });
}
