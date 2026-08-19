"use client";

import Link from "next/link";
import {
  HomeIcon,
  GamepadIcon,
  DiceIcon,
  HeartSwipeIcon,
  BriefcaseIcon,
  UserIcon,
  CloseIcon,
} from "./icons";

const LINKS = [
  { href: "/", label: "Início", Icon: HomeIcon },
  { href: "/games", label: "Meus jogos", Icon: GamepadIcon },
  { href: "/draw", label: "Sorteador", Icon: DiceIcon },
  { href: "/swipe", label: "Priquitinder", Icon: HeartSwipeIcon },
  { href: "/prikedin", label: "Prikedin", Icon: BriefcaseIcon },
  { href: "/priquitenses", label: "Priquitenses", Icon: UserIcon },
];

export default function Sidebar({
  user,
  open,
  onClose,
}: {
  user: { name?: string | null; username: string; avatarPath: string | null };
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <Link className="brand" href="/" onClick={onClose}>
          <img src="/favicon.ico" alt="" width={20} height={20} />
          <span>Priquito</span>
        </Link>
        <button className="drawer-close secondary" onClick={onClose} aria-label="Fechar menu">
          <CloseIcon />
        </button>
      </div>
      <nav>
        {LINKS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} onClick={onClose}>
            <Icon className="icon" />
            <span className="label">{label}</span>
          </Link>
        ))}
      </nav>
      <Link href="/profile" className="sidebar-user" onClick={onClose}>
        <img
          src={user.avatarPath ? `/api/uploads/${user.avatarPath}` : "/avatar-placeholder.svg"}
          alt=""
        />
        <span className="muted label">{user.name ?? user.username}</span>
      </Link>
    </aside>
  );
}
