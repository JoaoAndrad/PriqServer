"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";

export default function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; username: string; avatarPath: string | null };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <MobileHeader onMenuClick={() => setOpen(true)} />
      <Sidebar user={user} open={open} onClose={() => setOpen(false)} />
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <main className="page">{children}</main>
    </div>
  );
}
