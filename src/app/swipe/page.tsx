"use client";

import { useCallback, useEffect, useState } from "react";
import SwipeCard from "@/components/swipe/SwipeCard";
import MatchModal from "@/components/swipe/MatchModal";
import type { GameDTO, UserSummaryDTO } from "@/types";

export default function SwipePage() {
  const [game, setGame] = useState<GameDTO | null | undefined>(undefined);
  const [count, setCount] = useState(0);
  const [match, setMatch] = useState<{ game: GameDTO; users: UserSummaryDTO[] } | null>(null);

  const loadNext = useCallback(async () => {
    setGame(undefined);
    const res = await fetch("/api/swipe/next");
    const data = await res.json();
    setGame(data.game ?? null);
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function handleVote(liked: boolean) {
    if (!game) return;
    const votedGame = game;
    const res = await fetch("/api/swipe/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id, liked }),
    });
    const data = await res.json();
    setCount((c) => c + 1);

    if (data.matchedUsers?.length > 0) {
      setMatch({ game: votedGame, users: data.matchedUsers });
    } else {
      loadNext();
    }
  }

  function closeMatch() {
    setMatch(null);
    loadNext();
  }

  return (
    <div>
      <h1>Priquitinder</h1>
      <p className="muted">
        Curta os jogos que quer jogar, passe os que não te interessam. Arraste o card ou use os
        botões.
      </p>

      {game === undefined && <p className="muted">Carregando...</p>}

      {game === null && (
        <div className="card">
          <p className="muted">
            Você avaliou tudo por enquanto! Busque mais jogos em{" "}
            <a href="/games">Meus jogos</a>, ou tente de novo mais tarde.
          </p>
        </div>
      )}

      {game && <SwipeCard key={game.id} game={game} onVote={handleVote} />}

      {count > 0 && <p className="muted" style={{ marginTop: 16 }}>{count} jogos avaliados nessa sessão.</p>}

      {match && <MatchModal game={match.game} users={match.users} onClose={closeMatch} />}
    </div>
  );
}
