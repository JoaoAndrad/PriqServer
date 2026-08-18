"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PersonSelectModal from "@/components/match/PersonSelectModal";
import DrawResult from "@/components/draw/DrawResult";
import TransitionOverlay from "@/components/ui/TransitionOverlay";
import { CloseIcon } from "@/components/ui/icons";
import { sleep } from "@/lib/sleep";
import { coverSrc } from "@/lib/games/coverProxy";
import type { GameDTO, UserSummaryDTO } from "@/types";

/** Espera a imagem carregar de verdade (cache do navegador ou rede) antes de
 * revelar o resultado — sem isso o fetch do /api/draw termina rápido mas o
 * <img> só começa a baixar a capa quando o card monta, e o pop-in acontece
 * depois que a animação já sumiu. Nunca trava a revelação: se a capa falhar,
 * resolve mesmo assim. */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

interface NameLists {
  interestedBy: string[];
  favoritedBy: string[];
  ownedBy: string[];
}

interface FallbackEntry extends NameLists {
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
  const [modeFilter, setModeFilter] = useState<"any" | "online" | "coop">("any");
  const [picked, setPicked] = useState<GameDTO | null>(null);
  const [pickedNames, setPickedNames] = useState<NameLists | null>(null);
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

    // resolve o sorteio (fetch + capa pré-carregada) ANTES de começar a
    // animação — só então o overlay entra, cobrindo por 1.5s um card que já
    // está pronto e montado por baixo (só escondido pelo z-index). Assim a
    // duração da animação é só flourish, nunca tempo de espera de rede.
    const data = await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: selectedUsers.map((u) => u.id),
        requireOwned,
        modeFilter,
      }),
    }).then((res) => res.json());

    const url = coverSrc(data.picked?.coverUrl);
    if (url) await preloadImage(url);

    setShowTransition(true);
    setPicked(data.picked ?? null);
    setPickedNames(data.pickedNames ?? null);
    setFallbackUsed(data.fallbackUsed ?? false);
    setFallback(data.fallback ?? []);
    setDrawn(true);

    await sleep(1500);

    setShowTransition(false);
    setLoading(false);
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
                <button
                  type="button"
                  className="person-chip-remove"
                  aria-label={`Remover ${u.displayName}`}
                  onClick={() => setSelectedUsers((prev) => prev.filter((p) => p.id !== u.id))}
                >
                  <CloseIcon width={12} height={12} />
                </button>
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

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "0 0 16px" }}>
        {(
          [
            { value: "any", label: "Qualquer modo" },
            { value: "online", label: "Só online" },
            { value: "coop", label: "Só co-op" },
          ] as const
        ).map((opt) => (
          <label key={opt.value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="radio"
              name="modeFilter"
              checked={modeFilter === opt.value}
              onChange={() => setModeFilter(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <button onClick={draw} disabled={selectedUsers.length === 0 || loading}>
        {loading ? "Sorteando..." : "Sortear"}
      </button>

      {drawn && (
        <div style={{ marginTop: 16 }}>
          <DrawResult
            picked={picked}
            pickedNames={pickedNames}
            fallbackUsed={fallbackUsed}
            fallback={fallback}
          />
        </div>
      )}
    </div>
  );
}
