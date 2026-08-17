"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CandidateRankingList from "@/components/prikedin/CandidateRankingList";
import { CheckIcon, HourglassIcon, CloseIcon } from "@/components/ui/icons";
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
  scheduledAt: string;
  hasTime: boolean;
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
  { status: "pending", label: "Pendentes", Icon: HourglassIcon, className: "status-icon muted" },
  { status: "declined", label: "Recusaram", Icon: CloseIcon, className: "status-icon danger" },
];

function avatarSrc(u: UserSummaryDTO) {
  return u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg";
}

export default function RecruitmentDetailPage() {
  const params = useParams<{ recruitmentId: string }>();
  const id = params.recruitmentId;

  const [recruitment, setRecruitment] = useState<RecruitmentDetail | null>(null);
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [selectedToInvite, setSelectedToInvite] = useState<Set<string>>(new Set());
  const [myId, setMyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function closeRecruitment() {
    setBusy(true);
    await fetch(`/api/recruitments/${id}/close`, { method: "POST" });
    setBusy(false);
    load();
  }

  const date = new Date(recruitment.scheduledAt);
  const dateLabel = recruitment.hasTime
    ? date.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " — horário a combinar";

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
        {recruitment.game.coverUrl && (
          <img
            src={recruitment.game.coverUrl}
            alt=""
            style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }}
          />
        )}
        <div>
          <h1 style={{ margin: 0 }}>{recruitment.game.name}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {dateLabel} — criado por {recruitment.createdBy.displayName} —{" "}
            <span className="badge">{recruitment.status === "open" ? "aberta" : "fechada"}</span>
          </p>
        </div>
      </div>

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
                        <Link
                          key={inv.id}
                          href={`/u/${inv.user.id}`}
                          className="invite-person"
                        >
                          <img src={avatarSrc(inv.user)} alt="" />
                          <span>{inv.user.displayName}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isCreator && recruitment.status === "open" && (
        <div className="card">
          <h2>Convidar candidatos</h2>
          <p className="muted">Priorizado por favorito &gt; interesse &gt; demais.</p>
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
          <button onClick={join} disabled={busy}>
            Quero entrar nessa
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
