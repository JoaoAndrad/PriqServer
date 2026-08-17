"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RecruitmentCard, { type RecruitmentDTO } from "@/components/prikedin/RecruitmentCard";

const TABS = [
  { value: "feed", label: "Feed geral" },
  { value: "mine", label: "Minhas vagas" },
  { value: "invited", label: "Convites pra mim" },
];

export default function PrikedinFeedPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "feed";

  const [recruitments, setRecruitments] = useState<RecruitmentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/recruitments?scope=${tab}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        setRecruitments(data.recruitments ?? []);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [tab]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Prikedin</h1>
          <p className="muted">Recrute gente pra jogar, ou navegue as vagas abertas do grupo.</p>
        </div>
        <Link href="/prikedin/new" className="btn">
          + Criar vaga
        </Link>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.value} href={`/prikedin?tab=${t.value}`} className={t.value === tab ? "active" : ""}>
            {t.label}
          </Link>
        ))}
      </nav>

      {loading ? (
        <p className="muted">Carregando...</p>
      ) : recruitments.length === 0 ? (
        <p className="muted">
          {tab === "feed" && "Nenhuma vaga aberta no momento."}
          {tab === "mine" && "Você ainda não criou nenhuma vaga."}
          {tab === "invited" && "Você não tem convites ou candidaturas ainda."}
        </p>
      ) : (
        <div className="recruitment-grid">
          {recruitments.map((r) => (
            <RecruitmentCard key={r.id} recruitment={r} />
          ))}
        </div>
      )}
    </div>
  );
}
