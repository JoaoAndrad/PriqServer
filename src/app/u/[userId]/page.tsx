"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StarIcon } from "@/components/ui/icons";
import type { GameDTO } from "@/types";

interface PublicUserGame {
  favorite: boolean;
  interested: boolean;
  owned: boolean;
  game: GameDTO;
}

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  games: PublicUserGame[];
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => setNotFound(true));
  }, [userId]);

  if (notFound) return <p className="muted">Usuário não encontrado.</p>;
  if (!user) return <p className="muted">Carregando...</p>;

  const favorites = user.games.filter((g) => g.favorite);
  const interested = user.games.filter((g) => g.interested && !g.favorite);
  const owned = user.games.filter((g) => g.owned && !g.favorite && !g.interested);

  return (
    <div>
      <button className="secondary" onClick={() => router.back()} style={{ marginBottom: 16 }}>
        Voltar
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <img
          src={user.avatarPath ? `/api/uploads/${user.avatarPath}` : "/avatar-placeholder.svg"}
          alt=""
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
        />
        <div>
          <h1 style={{ margin: 0 }}>{user.displayName}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>@{user.username}</p>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="card">
          <h2 style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarIcon width={16} height={16} />
            Favoritos
          </h2>
          <div className="game-grid">
            {favorites.map((ug) => (
              <div key={ug.game.id} className="game-card">
                {ug.game.coverUrl && <img src={ug.game.coverUrl} alt="" />}
                <div className="body">{ug.game.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {interested.length > 0 && (
        <div className="card">
          <h2>Interesse</h2>
          <div className="game-grid">
            {interested.map((ug) => (
              <div key={ug.game.id} className="game-card">
                {ug.game.coverUrl && <img src={ug.game.coverUrl} alt="" />}
                <div className="body">{ug.game.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {owned.length > 0 && (
        <div className="card">
          <h2>Possui</h2>
          <div className="game-grid">
            {owned.map((ug) => (
              <div key={ug.game.id} className="game-card">
                {ug.game.coverUrl && <img src={ug.game.coverUrl} alt="" />}
                <div className="body">{ug.game.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {favorites.length === 0 && interested.length === 0 && owned.length === 0 && (
        <p className="muted">Nenhum jogo marcado ainda.</p>
      )}
    </div>
  );
}
