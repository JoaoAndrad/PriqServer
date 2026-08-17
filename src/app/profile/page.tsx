"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvailabilityManager from "@/components/availability/AvailabilityManager";
import SignOutButton from "@/components/ui/SignOutButton";
import Modal from "@/components/ui/Modal";

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  steamId64: string | null;
}

interface SteamPreviewItem {
  gameId: string;
  name: string;
  coverUrl: string | null;
  playtimeHours: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);

  const [steamProfile, setSteamProfile] = useState("");
  const [steamError, setSteamError] = useState<string | null>(null);
  const [steamPreview, setSteamPreview] = useState<SteamPreviewItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [steamModalOpen, setSteamModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.user);
        setDisplayName(data.user?.displayName ?? "");
        setSteamProfile(data.user?.steamId64 ?? "");
      });
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    setSavingName(false);
    setProfile((p) => (p ? { ...p, displayName } : p));
    setNameModalOpen(false);
    router.refresh();
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", avatarFile);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      setProfile((p) => (p ? { ...p, avatarPath: data.avatarPath } : p));
      router.refresh();
    }
  }

  async function searchSteam(e: React.FormEvent) {
    e.preventDefault();
    setSteamError(null);
    setSteamPreview(null);
    const res = await fetch("/api/import/steam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamProfile }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSteamError(data.error ?? "Falha ao importar");
      return;
    }
    setSteamPreview(data.items);
    setSelected(new Set(data.items.map((i: SteamPreviewItem) => i.gameId)));
    setSteamModalOpen(false);
  }

  function toggleSelected(gameId: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(gameId)) copy.delete(gameId);
      else copy.add(gameId);
      return copy;
    });
  }

  async function confirmImport() {
    setImporting(true);
    await fetch("/api/import/steam", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameIds: Array.from(selected) }),
    });
    setImporting(false);
    setSteamPreview(null);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamId64: steamProfile }),
    });
  }

  if (!profile) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <h1>Perfil</h1>

      <div className="card">
        <h2>Foto</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <img
            src={profile.avatarPath ? `/api/uploads/${profile.avatarPath}` : "/avatar-placeholder.svg"}
            alt=""
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", display: "block" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>{profile.displayName}</span>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setDisplayName(profile.displayName);
                setNameModalOpen(true);
              }}
              aria-label="Editar nome"
              title="Editar nome"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
              </svg>
            </button>
          </div>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={uploadAvatar} disabled={!avatarFile || uploading}>
            {uploading ? "Enviando..." : "Salvar foto"}
          </button>
        </div>
      </div>

      {nameModalOpen && (
        <Modal title="Editar nome" onClose={() => setNameModalOpen(false)}>
          <form onSubmit={saveName}>
            <div className="form-field">
              <label htmlFor="displayName">Nome de exibição</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" disabled={savingName}>
              {savingName ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </Modal>
      )}

      <details className="card">
        <summary>
          <h2 style={{ margin: 0 }}>Disponibilidade</h2>
        </summary>
        <p className="muted">Configure os horários em que você costuma estar livre, toda semana.</p>
        <AvailabilityManager />
      </details>

      <div className="card">
        <h2>Importar biblioteca da Steam</h2>
        <button type="button" onClick={() => setSteamModalOpen(true)}>
          Importar biblioteca da Steam
        </button>

        {steamPreview && (
          <div style={{ marginTop: 16 }}>
            <p className="muted">
              {steamPreview.length} jogos encontrados. Desmarque os que não quer importar como
              &quot;Possui&quot;.
            </p>
            <div className="game-grid">
              {steamPreview.map((item) => (
                <label key={item.gameId} className="game-card" style={{ display: "block", cursor: "pointer" }}>
                  {item.coverUrl && <img src={item.coverUrl} alt="" />}
                  <div className="body">
                    <input
                      type="checkbox"
                      checked={selected.has(item.gameId)}
                      onChange={() => toggleSelected(item.gameId)}
                    />{" "}
                    {item.name}
                    <div className="muted">{item.playtimeHours}h jogadas</div>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={confirmImport} disabled={importing} style={{ marginTop: 12 }}>
              {importing ? "Importando..." : `Importar ${selected.size} jogos`}
            </button>
          </div>
        )}
      </div>

      {steamModalOpen && (
        <Modal title="Importar biblioteca da Steam" onClose={() => setSteamModalOpen(false)}>
          <p className="muted">
            Informe seu perfil (steamID64 ou vanity URL). O perfil e os detalhes do jogo precisam
            estar públicos.
          </p>
          <form onSubmit={searchSteam} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="ex: 76561198000000000 ou seu-nome-de-perfil"
              value={steamProfile}
              onChange={(e) => setSteamProfile(e.target.value)}
              style={{ flex: 1 }}
              autoFocus
            />
            <button type="submit">Buscar</button>
          </form>
          {steamError && <p className="error">{steamError}</p>}
        </Modal>
      )}

      <div className="card">
        <SignOutButton />
      </div>
    </div>
  );
}
