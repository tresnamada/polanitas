import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Hash, Tag, FileText, ArrowUpRight, Zap, Database, Layers } from "lucide-react";

export const metadata: Metadata = { title: "Strategist Agent — POLANITAS" };

const FRAMEWORKS = [
  { label: "Chain-of-Thought", desc: "AI berpikir keras sebelum menulis — setiap skrip diawali <think> block untuk merencanakan struktur" },
  { label: "AIDA Framework", desc: "Attention → Interest → Desire → Action, diterapkan pada skrip 30 dan 60 detik" },
  { label: "PAS Framework", desc: "Problem → Agitate → Solution, efektif untuk konten emosional dan transformasi" },
  { label: "Hook-Story-Offer", desc: "Format TikTok creator terbukti viral: 3 detik pertama menentukan segalanya" },
];

const SCRIPT_VARIANTS = [
  { dur: "15s", color: "#F59E0B", words: "±30 kata", note: "Ideal untuk TikTok Ads & Instagram Reels hook" },
  { dur: "30s", color: "#8B5CF6", words: "±70 kata", note: "Format standar konten viral organik" },
  { dur: "60s", color: "#3B82F6", words: "±150 kata", note: "YouTube Shorts & penjelasan produk mendalam" },
];

const PROCESS_STEPS = [
  { num: "01", title: "Terima Data Riset", desc: "Baca ResearchOutput dari Firestore (/research/output) — YouTube trends, social trends, produk marketplace + AI keywords." },
  { num: "02", title: "Rangkum Konteks", desc: "Semua data diringkas menjadi briefing komprehensif: top 5 YouTube, 6 trending hashtag, 5 produk hot marketplace." },
  { num: "03", title: "Generate 3 Skrip Paralel", desc: "Llama 3.3 70B (GROQ_API_KEY_STARTEGIST_CONTENT) membuat 3 versi skrip (15s/30s/60s) secara paralel dengan viral hook, CTA, visual instruction, dan hashtag." },
  { num: "04", title: "Handoff ke Analyst", desc: "Semua skrip disimpan ke /strategy/output, lalu Agen Analyst segera diaktifkan untuk sintesis akhir." },
];

export default function StrategistPage() {
  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 40, paddingBottom: 64 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={18} color="#8B5CF6" />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Agen 02</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 10 }}>
            The Strategist
          </h1>
          <p style={{ color: "var(--color-text-secondary)", maxWidth: 560, lineHeight: 1.7, fontSize: "1rem" }}>
            Mengubah data riset mentah menjadi 3 versi skrip konten siap pakai menggunakan Chain-of-Thought prompting — viral hook, skrip video, visual instructions, CTA, dan hashtag.
          </p>
        </div>
        <Link href="/dashboard/sessions" style={{ textDecoration: "none" }}>
          <div className="btn btn-primary" style={{ gap: 6, fontSize: "0.875rem" }}>
            Lihat Sesi <ArrowUpRight size={15} />
          </div>
        </Link>
      </div>

      {/* ── Capabilities ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { icon: Zap, label: "Groq Llama 3.3 70B — GROQ_API_KEY_STARTEGIST_CONTENT" },
          { icon: Layers, label: "3 Skrip Paralel (15s / 30s / 60s)" },
          { icon: Database, label: "Output ke Firestore /strategy/output" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 100, background: "var(--color-surface)", border: "1px solid var(--color-border)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            <Icon size={13} color="#8B5CF6" />
            {label}
          </div>
        ))}
      </div>

      {/* ── Script variants ────────────────────────────────────── */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", marginBottom: 16 }}>Varian Skrip yang Dihasilkan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
          {SCRIPT_VARIANTS.map(({ dur, color, words, note }) => (
            <div key={dur} style={{ background: "var(--color-surface)", border: `1.5px solid ${color}30`, borderRadius: 18, padding: "20px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.7 }} />
              <div style={{ fontWeight: 800, fontSize: "2rem", color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{dur}</div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: 8 }}>{words}</div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Frameworks ─────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", marginBottom: 16 }}>Framework Copywriting</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {FRAMEWORKS.map(({ label, desc }) => (
            <div key={label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Zap size={14} color="#8B5CF6" />
                <span style={{ fontWeight: 800, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>{label}</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Process ────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.0625rem", marginBottom: 16 }}>Cara Kerja</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {PROCESS_STEPS.map((step, i) => (
            <div key={step.num} style={{ display: "flex", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(139,92,246,0.1)", border: "1.5px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: "#8B5CF6", zIndex: 1 }}>{step.num}</div>
                {i < PROCESS_STEPS.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--color-border)", margin: "4px 0", minHeight: 32 }} />}
              </div>
              <div style={{ paddingBottom: 32, paddingTop: 8 }}>
                <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--color-text-primary)", marginBottom: 6 }}>{step.title}</div>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Output preview ─────────────────────────────────────── */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={16} color="#8B5CF6" />
          <span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>Contoh Output Skrip</span>
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", padding: "3px 10px", borderRadius: 100, background: "rgba(139,92,246,0.08)", color: "#8B5CF6", fontWeight: 700 }}>15s · Emotional</span>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "14px 16px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 12 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#8B5CF6", letterSpacing: "0.08em", marginBottom: 6 }}>VIRAL HOOK</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-text-primary)", lineHeight: 1.4 }}>"Kulit sensitifku berubah dalam 3 malam — tanpa beli produk baru."</div>
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Skrip</div>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>Gue cuma ubah urutan pemakaian skincare yang udah ada — dan hasilnya beda banget. Ini namanya skin cycling...</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["#skincycling", "#kulitsensitif", "#skincaretips"].map(t => (
              <span key={t} style={{ padding: "5px 12px", borderRadius: 100, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                <Hash size={10} style={{ display: "inline", marginRight: 3 }} />{t.replace("#", "")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
