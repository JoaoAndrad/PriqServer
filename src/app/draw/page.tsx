"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PersonSelectModal from "@/components/match/PersonSelectModal";
import DrawResult from "@/components/draw/DrawResult";
import TransitionOverlay from "@/components/ui/TransitionOverlay";
import { sleep } from "@/lib/sleep";
import type { GameDTO, UserSummaryDTO } from "@/types";

interface FallbackEntry {
  gameId: string;
  interestedCount: number;
  favoriteCount: number;
  game: GameDTO | null;
}

export default function DrawPage() {
  const searchParams = useSearchParams();
  const prefilledUsers = searchParams.get("users");
  const prefilledIds = prefilledUsers ? prefilledUsers.split(",").filter(Boolean) : [];

  const [selectedUsers, setSelectedUsers] = useState<UserSummaryDTO[]>([]);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [requireOwned, setRequireOwned] = useState(false);
  const [picked, setPicked] = useState<GameDTO | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [fallback, setFallback] = useState<FallbackEntry[]>([]);
  const [drawn, setDrawn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (prefilledIds.length === 0) return;
    fetch("/api/users")
      .then((res) => res.json())
      .then((data: { users: UserSummaryDTO[] }) => {
        setSelectedUsers((data.users ?? []).filter((u) => prefilledIds.includes(u.id)));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function draw() {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    setShowTransition(true);

    const [res] = await Promise.all([
      fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers.map((u) => u.id), requireOwned }),
      }),
      sleep(1500),
    ]);
    const data = await res.json();

    setPicked(data.picked ?? null);
    setFallbackUsed(data.fallbackUsed ?? false);
    setFallback(data.fallback ?? []);
    setDrawn(true);
    setLoading(false);
    setShowTransition(false);
  }

  return (
    <div>
      <TransitionOverlay show={showTransition} />
      <h1>Sorteador — Qual o jogo de hoje?</h1>
      <p className="muted">Selecione quem vai jogar e deixe o sistema decidir.</p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" className="secondary" onClick={() => setPersonModalOpen(true)}>
          {selectedUsers.length === 0 ? "Selecionar jogadores" : "Editar jogadores"}
        </button>

        {selectedUsers.length > 0 && (
          <div className="person-selector" style={{ margin: 0 }}>
            {selectedUsers.map((u) => (
              <div key={u.id} className="person-chip selected">
                <img
                  src={u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg"}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
                />
                {u.displayName}
              </div>
            ))}
          </div>
        )}
      </div>

      {personModalOpen && (
        <PersonSelectModal
          selected={selectedUsers.map((u) => u.id)}
          onClose={() => setPersonModalOpen(false)}
          onConfirm={(users) => {
            setSelectedUsers(users);
            setPersonModalOpen(false);
          }}
        />
      )}

      <label style={{ display: "flex", gap: 6, alignItems: "center", margin: "8px 0 16px" }}>
        <input
          type="checkbox"
          checked={requireOwned}
          onChange={(e) => setRequireOwned(e.target.checked)}
        />
        Só jogos que todo mundo possui
      </label>

      <button onClick={draw} disabled={selectedUsers.length === 0 || loading}>
        {loading ? "Sorteando..." : "Sortear"}
      </button>

      {drawn && (
        <div style={{ marginTop: 16 }}>
          <DrawResult picked={picked} fallbackUsed={fallbackUsed} fallback={fallback} />
        </div>
      )}
    </div>
  );
}
