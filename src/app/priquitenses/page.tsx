"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserSummaryDTO } from "@/types";

export default function PriquitensesPage() {
  const [users, setUsers] = useState<UserSummaryDTO[] | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);

  return (
    <div>
      <h1>Priquitenses</h1>
      {!users && <p className="muted">Carregando...</p>}
      {users && users.length === 0 && <p className="muted">Nenhum usuário encontrado.</p>}
      {users && users.length > 0 && (
        <div className="game-grid">
          {users.map((u) => (
            <Link key={u.id} href={`/u/${u.id}`} className="card" style={{ textAlign: "center" }}>
              <img
                src={u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg"}
                alt=""
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  objectFit: "cover",
                  margin: "0 auto 8px",
                }}
              />
              <div>{u.displayName}</div>
              <div className="muted">@{u.username}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
