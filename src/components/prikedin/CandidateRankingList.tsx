"use client";

import { StarIcon } from "@/components/ui/icons";
import type { RankedCandidate } from "@/lib/prikedin/rankCandidates";

const TIER_LABEL: Record<RankedCandidate["tier"], string> = {
  favorite: "Favorito",
  interested: "Interesse",
  other: "Possui",
};

const TIER_BADGE_CLASS: Record<RankedCandidate["tier"], string> = {
  favorite: "badge favorite",
  interested: "badge interested",
  other: "badge owned",
};

export default function CandidateRankingList({
  candidates,
  selected,
  onToggle,
}: {
  candidates: RankedCandidate[];
  selected: Set<string>;
  onToggle: (userId: string) => void;
}) {
  if (candidates.length === 0) {
    return <p className="muted">Ninguém do grupo tem esse jogo marcado ainda.</p>;
  }

  return (
    <div className="candidate-grid">
      {candidates.map((c) => (
        <div
          key={c.userId}
          className={`candidate-card ${selected.has(c.userId) ? "selected" : ""}`}
          onClick={() => onToggle(c.userId)}
        >
          <img
            src={c.avatarPath ? `/api/uploads/${c.avatarPath}` : "/avatar-placeholder.svg"}
            alt=""
          />
          <strong style={{ fontSize: "0.85rem" }}>{c.displayName}</strong>
          <span
            className={TIER_BADGE_CLASS[c.tier]}
            style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {c.tier === "favorite" && <StarIcon width={11} height={11} />}
            {TIER_LABEL[c.tier]}
          </span>
        </div>
      ))}
    </div>
  );
}
