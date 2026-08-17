"use client";

import Link from "next/link";
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
            <Link key={u.id} href={`/u/${u.id}`} onClick={onClose} title={u.displayName}>
              <img
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
            </Link>
          ))}
        </div>
        <p>
          {users.length === 1 ? (
            <>
              <Link href={`/u/${users[0].id}`} onClick={onClose}>
                <strong>{users[0].displayName}</strong>
              </Link>{" "}
              também curtiu <strong>{game.name}</strong>!
            </>
          ) : (
            <>
              <strong>
                {users.map((u, i) => (
                  <span key={u.id}>
                    {i > 0 && ", "}
                    <Link href={`/u/${u.id}`} onClick={onClose}>
                      {u.displayName}
                    </Link>
                  </span>
                ))}
              </strong>{" "}
              também curtiram <strong>{game.name}</strong>!
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          <Link
            href={`/prikedin/new?gameId=${game.id}${
              users.length === 1
                ? `&inviteUserId=${users[0].id}&inviteUserName=${encodeURIComponent(users[0].displayName)}`
                : ""
            }`}
            onClick={onClose}
          >
            <button>Convidar para jogar</button>
          </Link>
          <button className="secondary" onClick={onClose}>
            Continuar
          </button>
        </div>
      </div>
    </Modal>
  );
}
