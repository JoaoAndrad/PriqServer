"use client";

export interface GameFlags {
  interested: boolean;
  favorite: boolean;
  owned: boolean;
  blacklisted: boolean;
}

const CATEGORIES: { key: keyof GameFlags; label: string }[] = [
  { key: "interested", label: "Interesse" },
  { key: "favorite", label: "Favorito" },
  { key: "owned", label: "Possui" },
  { key: "blacklisted", label: "Blacklist" },
];

export default function GameCategoryToggle({
  flags,
  onToggle,
}: {
  flags: GameFlags;
  onToggle: (key: keyof GameFlags, value: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          type="button"
          className={flags[cat.key] ? "active" : ""}
          onClick={() => onToggle(cat.key, !flags[cat.key])}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
