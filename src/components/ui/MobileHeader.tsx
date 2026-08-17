"use client";

import Link from "next/link";
import { MenuIcon } from "./icons";

export default function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="mobile-header">
      <button className="secondary" onClick={onMenuClick} aria-label="Abrir menu">
        <MenuIcon />
      </button>
      <Link className="brand" href="/">
        <img src="/favicon.ico" alt="" width={20} height={20} />
        <span>Priquito</span>
      </Link>
      <div style={{ width: 40 }} />
    </header>
  );
}
