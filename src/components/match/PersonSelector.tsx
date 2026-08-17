"use client";

import { useEffect, useState } from "react";
import type { UserSummaryDTO } from "@/types";

export default function PersonSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (userIds: string[]) => void;
}) {
  const [users, setUsers] = useState<UserSummaryDTO[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);

  function toggle(userId: string) {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  }

  return (
    <div className="person-selector">
      {users.map((u) => (
        <div
          key={u.id}
          className={`person-chip ${selected.includes(u.id) ? "selected" : ""}`}
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
  );
}
