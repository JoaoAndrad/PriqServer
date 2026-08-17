import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getNextSwipeCandidate } from "@/lib/swipe/nextCandidate";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const game = await getNextSwipeCandidate(user.id);
  return NextResponse.json({ game });
}
