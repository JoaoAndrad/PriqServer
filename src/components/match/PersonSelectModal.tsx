"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { UserSummaryDTO } from "@/types";

export default function PersonSelectModal({
  selected,
  onConfirm,
  onClose,
}: {
  selected: string[];
  onConfirm: (users: UserSummaryDTO[]) => void;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<UserSummaryDTO[]>([]);
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);

  function toggle(userId: string) {
    setDraft((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const allSelected = users.length > 0 && draft.length === users.length;

  function toggleAll() {
    setDraft(allSelected ? [] : users.map((u) => u.id));
  }

  return (
    <Modal title="Selecionar jogadores" onClose={onClose}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
        Selecionar todos
      </label>

      <div className="person-selector">
        {users.map((u) => (
          <div
            key={u.id}
            className={`person-chip ${draft.includes(u.id) ? "selected" : ""}`}
            onClick={() => toggle(u.id)}
          >
            <img
              src={u.avatarPath ? `/api/uploads/${u.avatarPath}` : "/avatar-placeholder.svg"}
              alt=""
              style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
            />
            {u.displayName}
          </div>
        ))}
      </div>

      <button
        type="button"
        style={{ marginTop: 16 }}
        onClick={() => onConfirm(users.filter((u) => draft.includes(u.id)))}
        disabled={draft.length === 0}
      >
        Salvar
      </button>
    </Modal>
  );
}
