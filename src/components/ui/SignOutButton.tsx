"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      className="secondary"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sair
    </button>
  );
}
