"use client";

import Modal from "@/components/ui/Modal";
import { SparklesIcon } from "@/components/ui/icons";
import type { GameDTO, UserSummaryDTO } from "@/types";

function avatarSrc(u: UserSummaryDTO) {
  return u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg";
}

export default function MatchModal({
  game,
  users,
  onClose,
}: {
  game: GameDTO;
  users: UserSummaryDTO[];
  onClose: () => void;
}) {
  return (
    <Modal
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <SparklesIcon width={20} height={20} />
          Deu match!
        </span>
      }
      onClose={onClose}
    >
      <div style={{ textAlign: "center" }}>
        {game.coverUrl && (
          <img
            src={game.coverUrl}
            alt=""
            style={{ maxWidth: 200, borderRadius: 8, margin: "0 auto 16px" }}
          />
        )}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          {users.map((u) => (
            <img
              key={u.id}
              src={avatarSrc(u)}
              alt={u.displayName}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid var(--bg-elevated)",
                marginLeft: -12,
              }}
            />
          ))}
        </div>
        <p>
          {users.length === 1 ? (
            <>
              <strong>{users[0].displayName}</strong> também curtiu <strong>{game.name}</strong>!
            </>
          ) : (
            <>
              <strong>{users.map((u) => u.displayName).join(", ")}</strong> também curtiram{" "}
              <strong>{game.name}</strong>!
            </>
          )}
        </p>
        <button onClick={onClose} style={{ marginTop: 8 }}>
          Continuar
        </button>
      </div>
    </Modal>
  );
}
