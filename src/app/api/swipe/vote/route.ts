import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const voteSchema = z.object({
  gameId: z.string().min(1),
  liked: z.boolean(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { gameId, liked } = parsed.data;

  const userGame = await prisma.userGame.upsert({
    where: { userId_gameId: { userId: user.id, gameId } },
    create: { userId: user.id, gameId, interested: liked, dismissed: !liked },
    update: liked ? { interested: true, dismissed: false } : { dismissed: true },
  });

  // Se curtiu, avisa se mais alguém do grupo também já curtiu esse jogo — "match" estilo Tinder.
  let matchedUsers: { id: string; displayName: string; avatarPath: string | null }[] = [];
  if (liked) {
    const others = await prisma.userGame.findMany({
      where: { gameId, interested: true, userId: { not: user.id } },
      select: { user: { select: { id: true, displayName: true, avatarPath: true } } },
    });
    matchedUsers = others.map((o) => o.user);

    if (matchedUsers.length > 0) {
      // upsert em vez de createMany({ skipDuplicates: true }) — SQLite não
      // suporta skipDuplicates no Prisma.
      await Promise.all(
        matchedUsers.map((other) =>
          prisma.match.upsert({
            where: {
              gameId_triggeredById_withId: { gameId, triggeredById: user.id, withId: other.id },
            },
            create: { gameId, triggeredById: user.id, withId: other.id },
            update: {},
          }),
        ),
      );
    }
  }

  return NextResponse.json({ userGame, matchedUsers });
}
