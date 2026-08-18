import Link from "next/link";
import { coverSrc } from "@/lib/games/coverProxy";
import type { GameDTO, UserSummaryDTO } from "@/types";

export interface InviteDTO {
  id: string;
  userId: string;
  source: string;
  status: string;
  user: UserSummaryDTO;
}

export interface RecruitmentDTO {
  id: string;
  scheduledAt: string;
  hasTime: boolean;
  status: string;
  maxSlots: number | null;
  createdById: string;
  game: GameDTO;
  createdBy: UserSummaryDTO;
  invites: InviteDTO[];
}

function avatarSrc(u: UserSummaryDTO) {
  return u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg";
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function urgencyLabel(scheduledAt: Date): { label: string; tone: "now" | "soon" | "later" } {
  const diffDays = Math.round(
    (startOfDay(scheduledAt).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return { label: "Já passou", tone: "later" };
  if (diffDays === 0) return { label: "Hoje", tone: "now" };
  if (diffDays === 1) return { label: "Amanhã", tone: "soon" };
  return {
    label: scheduledAt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
    tone: "later",
  };
}

export default function RecruitmentCard({ recruitment }: { recruitment: RecruitmentDTO }) {
  const accepted = recruitment.invites.filter((i) => i.status === "accepted");
  const date = new Date(recruitment.scheduledAt);
  const urgency = urgencyLabel(date);

  const dateLabel = recruitment.hasTime
    ? date.toLocaleString("pt-BR", { weekday: "long", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

  return (
    <Link href={`/prikedin/${recruitment.id}`} className="recruitment-card">
      <div className="recruitment-card-cover">
        {recruitment.game.coverUrl && <img src={coverSrc(recruitment.game.coverUrl)!} alt="" />}
        <span className={`badge urgency-${urgency.tone}`}>{urgency.label}</span>
        {recruitment.status === "closed" && <span className="badge closed">fechada</span>}
        {recruitment.status === "expired" && <span className="badge closed">expirada</span>}
      </div>
      <div className="recruitment-card-body">
        <h3>{recruitment.game.name}</h3>
        <p className="muted" style={{ margin: "2px 0 10px" }}>
          {dateLabel} — por {recruitment.createdBy.displayName}
          {recruitment.maxSlots != null && (
            <>
              {" "}
              — {accepted.length}/{recruitment.maxSlots} vagas
              {accepted.length >= recruitment.maxSlots && " (cheia)"}
            </>
          )}
        </p>
        <div className="avatar-stack">
          {accepted.slice(0, 5).map((inv) => (
            <img key={inv.id} src={avatarSrc(inv.user)} alt={inv.user.displayName} title={inv.user.displayName} />
          ))}
          {accepted.length === 0 && <span className="muted">Ninguém confirmou ainda</span>}
          {accepted.length > 5 && <span className="muted">+{accepted.length - 5}</span>}
        </div>
      </div>
    </Link>
  );
}
