"use client";

import { useCallback, useEffect, useState } from "react";
import SwipeCard from "@/components/swipe/SwipeCard";
import MatchModal from "@/components/swipe/MatchModal";
import type { GameDTO, UserSummaryDTO } from "@/types";

const QUEUE_SIZE = 5;

interface QueueItem {
  game: GameDTO;
  ownedByOthers: boolean;
}

export default function SwipePage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [match, setMatch] = useState<{ game: GameDTO; users: UserSummaryDTO[] } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/swipe/next?count=${QUEUE_SIZE}`);
      const data = await res.json();
      setQueue(data.games ?? []);
      setLoading(false);
    })();
  }, []);

  // Repõe o fim da fila até voltar a QUEUE_SIZE, excluindo o que já está nela
  // (`currentQueue`) pra não puxar jogo repetido — dispara em background, sem
  // travar a exibição do próximo card, que já está pronto na fila local.
  const replenish = useCallback(async (currentQueue: QueueItem[]) => {
    const missing = QUEUE_SIZE - currentQueue.length;
    if (missing <= 0) return;

    const exclude = currentQueue.map((q) => q.game.id).join(",");
    const res = await fetch(
      `/api/swipe/next?count=${missing}&exclude=${encodeURIComponent(exclude)}`,
    );
    const data = await res.json();
    const fetched: QueueItem[] = data.games ?? [];
    if (fetched.length === 0) return;

    setQueue((q) => (q.length >= QUEUE_SIZE ? q : [...q, ...fetched].slice(0, QUEUE_SIZE)));
  }, []);

  async function handleVote(liked: boolean) {
    if (queue.length === 0) return;
    const voted = queue[0];
    const rest = queue.slice(1);
    setQueue(rest);

    const res = await fetch("/api/swipe/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: voted.game.id, liked }),
    });
    const data = await res.json();

    if (data.matchedUsers?.length > 0) {
      setMatch({ game: voted.game, users: data.matchedUsers });
    }

    replenish(rest);
  }

  function closeMatch() {
    setMatch(null);
  }

  const current = queue[0];

  return (
    <div>
      <h1>Priquitinder</h1>
      <p className="muted">
        Curta os jogos que quer jogar, passe os que não te interessam. Arraste o card ou use os
        botões.
      </p>

      {loading && <p className="muted">Carregando...</p>}

      {!loading && !current && (
        <div className="card">
          <p className="muted">
            Você avaliou tudo por enquanto! Busque mais jogos em{" "}
            <a href="/games">Meus jogos</a>, ou tente de novo mais tarde.
          </p>
        </div>
      )}

      {current && (
        <SwipeCard
          key={current.game.id}
          game={current.game}
          ownedByOthers={current.ownedByOthers}
          onVote={handleVote}
        />
      )}

      {match && <MatchModal game={match.game} users={match.users} onClose={closeMatch} />}
    </div>
  );
}
