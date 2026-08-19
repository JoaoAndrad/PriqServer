"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CandidateRankingList from "@/components/prikedin/CandidateRankingList";
import { CheckIcon, HourglassIcon, CloseIcon } from "@/components/ui/icons";
import { coverSrc } from "@/lib/games/coverProxy";
import type { RankedCandidate } from "@/lib/prikedin/rankCandidates";
import type { GameDTO, UserSummaryDTO } from "@/types";
import type { ComponentType, SVGProps } from "react";

interface InviteDTO {
  id: string;
  userId: string;
  source: string;
  status: string;
  user: UserSummaryDTO;
}

interface RecruitmentDetail {
  id: string;
  status: string;
  title: string | null;
  description: string | null;
  scheduledAt: string;
  hasTime: boolean;
  maxSlots: number | null;
  game: GameDTO;
  createdBy: UserSummaryDTO;
  invites: InviteDTO[];
}

const COLUMNS: {
  status: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  className: string;
}[] = [
  { status: "accepted", label: "Confirmados", Icon: CheckIcon, className: "status-icon success" },
  { status: "waitlisted", label: "Em espera", Icon: HourglassIcon, className: "status-icon warning" },
  { status: "pending", label: "Pendentes", Icon: HourglassIcon, className: "status-icon muted" },
  { status: "declined", label: "Recusaram", Icon: CloseIcon, className: "status-icon danger" },
];

function avatarSrc(u: UserSummaryDTO) {
  return u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg";
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function RecruitmentDetailPage() {
  const params = useParams<{ recruitmentId: string }>();
  const id = params.recruitmentId;

  const [recruitment, setRecruitment] = useState<RecruitmentDetail | null>(null);
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [selectedToInvite, setSelectedToInvite] = useState<Set<string>>(new Set());
  const [myId, setMyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editMaxSlots, setEditMaxSlots] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/recruitments/${id}`);
    const data = await res.json();
    setRecruitment(data.recruitment);
    setCandidates(data.candidates ?? []);
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => setMyId(data.user?.id ?? null));
  }, [load]);

  if (!recruitment) return <p className="muted">Carregando...</p>;

  const isCreator = recruitment.createdBy.id === myId;
  const myInvite = recruitment.invites.find((i) => i.userId === myId);
  const isConfirmedParticipant = myInvite?.status === "accepted";
  const canInvite = isCreator || isConfirmedParticipant;

  async function invite() {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: Array.from(selectedToInvite) }),
    });
    setBusy(false);
    setSelectedToInvite(new Set());
    load();
  }

  async function respond(accept: boolean) {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    setBusy(false);
    load();
  }

  async function join() {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/join`, { method: "POST" });
    setBusy(false);
    load();
  }

  async function leave() {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/leave`, { method: "POST" });
    setBusy(false);
    load();
  }

  async function removeParticipant(userId: string) {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    load();
  }

  async function closeRecruitment() {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/close`, { method: "POST" });
    setBusy(false);
    load();
  }

  function openEdit() {
    const current = new Date(recruitment!.scheduledAt);
    setEditTitle(recruitment!.title ?? "");
    setEditDescription(recruitment!.description ?? "");
    setEditDate(toDateInputValue(current));
    setEditTime(recruitment!.hasTime ? toTimeInputValue(current) : "");
    setEditMaxSlots(recruitment!.maxSlots != null ? String(recruitment!.maxSlots) : "");
    setEditError(null);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editDate) return;
    setBusy(true);
    setEditError(null);

    const [y, m, day] = editDate.split("-").map(Number);
    const date = new Date(y, m - 1, day);
    const hasTime = editTime.trim().length > 0;
    if (hasTime) {
      const [h, min] = editTime.split(":").map(Number);
      date.setHours(h, min, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    const res = await fetch(`/api/recruitments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim() || null,
        description: editDescription.trim() || null,
        scheduledAt: date.toISOString(),
        hasTime,
        maxSlots: editMaxSlots.trim() ? Number(editMaxSlots) : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setEditError(data.error ?? "Não foi possível salvar");
      return;
    }
    setEditing(false);
    load();
  }

  const date = new Date(recruitment.scheduledAt);
  const dateLabel = recruitment.hasTime
    ? date.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " — horário a combinar";

  const acceptedCount = recruitment.invites.filter((i) => i.status === "accepted").length;
  const isFull = recruitment.maxSlots != null && acceptedCount >= recruitment.maxSlots;
  const statusLabel =
    recruitment.status === "open" ? "aberta" : recruitment.status === "expired" ? "expirada" : "fechada";

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
        {recruitment.game.coverUrl && (
          <img
            src={coverSrc(recruitment.game.coverUrl)!}
            alt=""
            style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }}
          />
        )}
        <div>
          {recruitment.title ? (
            <>
              <h1 style={{ margin: 0 }}>{recruitment.title}</h1>
              <p className="muted" style={{ margin: "2px 0 0" }}>{recruitment.game.name}</p>
            </>
          ) : (
            <h1 style={{ margin: 0 }}>{recruitment.game.name}</h1>
          )}
          {recruitment.description && (
            <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{recruitment.description}</p>
          )}
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {dateLabel} — criado por {recruitment.createdBy.displayName} —{" "}
            <span className="badge">{statusLabel}</span>
            {recruitment.maxSlots != null && (
              <>
                {" "}
                — {acceptedCount}/{recruitment.maxSlots} vagas
                {isFull && " (cheia)"}
              </>
            )}
          </p>
          {isCreator && recruitment.status !== "closed" && !editing && (
            <button type="button" className="secondary" style={{ marginTop: 8 }} onClick={openEdit}>
              Editar vaga
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="card">
          <h2>Editar vaga</h2>
          <div className="form-field">
            <label htmlFor="editTitle">Título (opcional)</label>
            <input
              id="editTitle"
              type="text"
              maxLength={80}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="editDescription">Descrição (opcional)</label>
            <textarea
              id="editDescription"
              maxLength={500}
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="form-field" style={{ maxWidth: 200 }}>
              <label htmlFor="editDate">Dia</label>
              <input id="editDate" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="form-field" style={{ maxWidth: 200 }}>
              <label htmlFor="editTime">Horário (opcional)</label>
              <input id="editTime" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
            </div>
            <div className="form-field" style={{ maxWidth: 200 }}>
              <label htmlFor="editMaxSlots">Vagas máximas (opcional)</label>
              <input
                id="editMaxSlots"
                type="number"
                min={1}
                max={999}
                placeholder="Sem limite"
                value={editMaxSlots}
                onChange={(e) => setEditMaxSlots(e.target.value)}
              />
            </div>
          </div>
          {editError && <p className="error">{editError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveEdit} disabled={busy || !editDate}>
              Salvar
            </button>
            <button type="button" className="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Participantes</h2>
        {recruitment.invites.length === 0 ? (
          <p className="muted">Ninguém convidado/entrou ainda.</p>
        ) : (
          <div className="invite-columns">
            {COLUMNS.map((col) => {
              const people = recruitment.invites.filter((i) => i.status === col.status);
              return (
                <div key={col.status} className="invite-column">
                  <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <col.Icon className={col.className} />
                    {col.label} ({people.length})
                  </h3>
                  <div className="invite-column-list">
                    {people.length === 0 ? (
                      <p className="muted" style={{ fontSize: "0.85rem" }}>
                        Ninguém aqui.
                      </p>
                    ) : (
                      people.map((inv) => (
                        <div key={inv.id} className="invite-person-row">
                          <Link href={`/u/${inv.user.id}`} className="invite-person">
                            <img src={avatarSrc(inv.user)} alt="" />
                            <span>{inv.user.displayName}</span>
                          </Link>
                          {isCreator && inv.userId !== myId && (
                            <button
                              type="button"
                              className="person-chip-remove"
                              aria-label={`Remover ${inv.user.displayName}`}
                              disabled={busy}
                              onClick={() => removeParticipant(inv.userId)}
                            >
                              <CloseIcon width={12} height={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canInvite && recruitment.status === "open" && (
        <div className="card">
          <h2>Convidar candidatos</h2>
          <p className="muted">Priorizado por favorito &gt; interesse &gt; possui &gt; demais.</p>
          <CandidateRankingList
            candidates={candidates.filter(
              (c) => !recruitment.invites.some((i) => i.userId === c.userId),
            )}
            selected={selectedToInvite}
            onToggle={(userId) =>
              setSelectedToInvite((prev) => {
                const copy = new Set(prev);
                if (copy.has(userId)) copy.delete(userId);
                else copy.add(userId);
                return copy;
              })
            }
          />
          <button onClick={invite} disabled={selectedToInvite.size === 0 || busy} style={{ marginTop: 12 }}>
            Convidar selecionados
          </button>
        </div>
      )}

      {!isCreator && myInvite?.status === "pending" && (
        <div className="card">
          <h2>Você foi convidado!</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => respond(true)} disabled={busy}>
              Aceitar
            </button>
            <button className="secondary" onClick={() => respond(false)} disabled={busy}>
              Recusar
            </button>
          </div>
        </div>
      )}

      {!isCreator && !myInvite && recruitment.status === "open" && (
        <div className="card">
          {isFull && (
            <p className="muted" style={{ marginTop: 0 }}>
              Vaga cheia — você vai entrar na lista de espera.
            </p>
          )}
          <button onClick={join} disabled={busy}>
            {isFull ? "Entrar na lista de espera" : "Quero entrar nessa"}
          </button>
        </div>
      )}

      {!isCreator && (myInvite?.status === "accepted" || myInvite?.status === "waitlisted") && (
        <div className="card">
          <button className="secondary" onClick={leave} disabled={busy}>
            {myInvite.status === "waitlisted" ? "Sair da lista de espera" : "Sair da vaga"}
          </button>
        </div>
      )}

      {isCreator && recruitment.status === "open" && (
        <button className="danger" onClick={closeRecruitment} disabled={busy}>
          Fechar vaga
        </button>
      )}
    </div>
  );
}
