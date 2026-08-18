"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GameAutocomplete from "@/components/games/GameAutocomplete";
import { coverSrc } from "@/lib/games/coverProxy";
import type { GameDTO } from "@/types";

type DayPreset = "today" | "tomorrow" | "weekend" | "custom";

const DAY_OPTIONS: { value: DayPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "tomorrow", label: "Amanhã" },
  { value: "weekend", label: "Este fim de semana" },
  { value: "custom", label: "Escolher outro dia" },
];

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetToDate(preset: DayPreset, customDate: string): Date {
  const today = new Date();
  if (preset === "today") return today;
  if (preset === "tomorrow") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (preset === "weekend") {
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
    const d = new Date(today);
    d.setDate(d.getDate() + daysUntilSaturday);
    return d;
  }
  // custom
  if (customDate) {
    const [y, m, d] = customDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return today;
}

export default function NewRecruitmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledGameId = searchParams.get("gameId");
  const inviteUserId = searchParams.get("inviteUserId");
  const inviteUserName = searchParams.get("inviteUserName");

  const [selectedGame, setSelectedGame] = useState<GameDTO | null>(null);
  const [dayPreset, setDayPreset] = useState<DayPreset>("today");
  const [customDate, setCustomDate] = useState(toDateInputValue(new Date()));
  const [time, setTime] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefilledGameId) return;
    let ignore = false;
    fetch(`/api/games/${prefilledGameId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.game) setSelectedGame(data.game);
      });
    return () => {
      ignore = true;
    };
  }, [prefilledGameId]);

  async function createRecruitment() {
    if (!selectedGame) return;
    setCreating(true);
    setError(null);

    const date = presetToDate(dayPreset, customDate);
    const hasTime = time.trim().length > 0;
    if (hasTime) {
      const [h, m] = time.split(":").map(Number);
      date.setHours(h, m, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    const parsedMaxSlots = maxSlots.trim() ? Number(maxSlots) : undefined;

    const res = await fetch("/api/recruitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: selectedGame.id,
        scheduledAt: date.toISOString(),
        hasTime,
        maxSlots: parsedMaxSlots,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreating(false);
      setError(data.error ?? "Não foi possível criar a vaga");
      return;
    }

    if (inviteUserId) {
      await fetch(`/api/recruitments/${data.recruitment.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [inviteUserId] }),
      });
    }

    setCreating(false);
    router.push(`/prikedin/${data.recruitment.id}`);
  }

  return (
    <div>
      <h1>Criar vaga</h1>
      <p className="muted">Escolha o jogo e diga mais ou menos quando rola — não precisa ser exato.</p>
      {inviteUserId && (
        <p className="muted">
          <strong>{inviteUserName ?? "Esse jogador"}</strong> já vai ser convidado automaticamente.
        </p>
      )}

      <div className="card">
        {!selectedGame ? (
          <div className="form-field">
            <label>Qual jogo?</label>
            <GameAutocomplete onSelect={setSelectedGame} />
          </div>
        ) : (
          <>
            <div className="form-field">
              <label>Jogo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selectedGame.coverUrl && (
                  <img
                    src={coverSrc(selectedGame.coverUrl)!}
                    alt=""
                    style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 4 }}
                  />
                )}
                <strong>{selectedGame.name}</strong>
                <button className="secondary" onClick={() => setSelectedGame(null)}>
                  Trocar
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>Quando</label>
              <div className="toggle-row" style={{ marginTop: 0 }}>
                {DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={dayPreset === opt.value ? "active" : ""}
                    onClick={() => setDayPreset(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {dayPreset === "custom" && (
              <div className="form-field" style={{ maxWidth: 200 }}>
                <label htmlFor="customDate">Dia</label>
                <input
                  id="customDate"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
            )}

            <div className="form-field" style={{ maxWidth: 200 }}>
              <label htmlFor="time">Horário (opcional)</label>
              <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>

            <div className="form-field" style={{ maxWidth: 200 }}>
              <label htmlFor="maxSlots">Vagas máximas (opcional)</label>
              <input
                id="maxSlots"
                type="number"
                min={1}
                max={999}
                placeholder="Sem limite"
                value={maxSlots}
                onChange={(e) => setMaxSlots(e.target.value)}
              />
              <p className="muted" style={{ fontSize: "0.85rem", margin: "4px 0 0" }}>
                Quem entrar depois que lotar vai para a lista de espera.
              </p>
            </div>

            <p className="muted" style={{ fontSize: "0.85rem" }}>
              A vaga expira automaticamente 3 horas após o horário marcado.
            </p>

            <button onClick={createRecruitment} disabled={creating}>
              {creating ? "Criando..." : "Criar vaga"}
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
