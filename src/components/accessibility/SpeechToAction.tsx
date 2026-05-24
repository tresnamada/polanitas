"use client";

/**
 * POLANITAS — Speech-to-Action (Groq Whisper powered)
 * Records mic audio → Groq Whisper → command matching → navigation + TTS
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Mic, MicOff, ChevronUp, ChevronDown, Loader2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroqSpeech } from "@/hooks/use-groq-speech";
import { useAuth } from "@/components/auth/AuthProvider";
import { askAboutPage } from "@/actions/page-context-action";
import { parseFormIntent } from "@/actions/form-intent-action";
import { dispatchVoiceFormAction } from "@/lib/voice-form-filler";
import { useAccessibility } from "@/hooks/use-accessibility";
import { useDraggable } from "@/hooks/use-draggable";
import { speak } from "@/lib/speech-utils";

// ── Command map ────────────────────────────────────────────────────────────────
const ROUTE_COMMANDS: { patterns: string[]; path: string; announce: string }[] = [
  { patterns: ["buka dashboard", "ke dashboard", "halaman utama", "home"], path: "/dashboard", announce: "Membuka Dashboard." },
  { patterns: ["buka materi", "lihat materi", "buka modul", "kurikulum", "semua materi"], path: "/dashboard/learn", announce: "Membuka Materi." },
  { patterns: ["buka sesi", "sesi riset", "mulai riset", "buka riset"], path: "/dashboard/sessions", announce: "Membuka Sesi Riset." },
  { patterns: ["buka heatmap", "eye tracking", "heatmap"], path: "/dashboard/heatmaps", announce: "Membuka Heatmap." },
  { patterns: ["buka researcher", "researcher"], path: "/dashboard/researcher", announce: "Membuka Researcher." },
  { patterns: ["buka strategist", "strategist"], path: "/dashboard/strategist", announce: "Membuka Strategist." },
  { patterns: ["buka analyst", "analyst"], path: "/dashboard/analyst", announce: "Membuka Analyst." },
  { patterns: ["buka laporan", "laporan"], path: "/dashboard/reports", announce: "Membuka Laporan." },
  { patterns: ["modul satu", "modul 1", "materi satu", "materi 1", "orkestrasi ai", "orkestrasi"], path: "/dashboard/learn/ai-orchestration", announce: "Membuka Modul satu." },
  { patterns: ["modul dua", "modul 2", "materi dua", "materi 2", "deteksi tren", "tren dini"], path: "/dashboard/learn/trend-signal", announce: "Membuka Modul dua." },
  { patterns: ["modul tiga", "modul 3", "materi tiga", "materi 3", "whitespace", "marketplace"], path: "/dashboard/learn/marketplace-whitespace", announce: "Membuka Modul tiga." },
  { patterns: ["modul empat", "modul 4", "materi empat", "materi 4", "eye tracking mastery"], path: "/dashboard/learn/eye-tracking", announce: "Membuka Modul empat." },
  { patterns: ["modul lima", "modul 5", "materi lima", "materi 5", "copywriting", "llm"], path: "/dashboard/learn/llm-copywriting", announce: "Membuka Modul lima." },
  { patterns: ["modul enam", "modul 6", "materi enam", "materi 6", "content atomization", "atomisasi"], path: "/dashboard/learn/content-atomization", announce: "Membuka Modul enam." },
  { patterns: ["modul tujuh", "modul 7", "materi tujuh", "materi 7", "neuromarketing"], path: "/dashboard/learn/neuromarketing", announce: "Membuka Modul tujuh." },
  { patterns: ["modul delapan", "modul 8", "materi delapan", "materi 8", "manajemen krisis", "krisis"], path: "/dashboard/learn/crisis-management", announce: "Membuka Modul delapan." },
  { patterns: ["modul sembilan", "modul 9", "materi sembilan", "materi 9", "atribusi roi", "atribusi", "roi"], path: "/dashboard/learn/roi-attribution", announce: "Membuka Modul sembilan." },
  { patterns: ["modul sepuluh", "modul 10", "materi sepuluh", "materi 10", "etika ai", "etika"], path: "/dashboard/learn/ai-ethics", announce: "Membuka Modul sepuluh." },
  { patterns: ["modul sebelas", "modul 11", "materi sebelas", "materi 11", "influencer matching", "influencer"], path: "/dashboard/learn/influencer-dna", announce: "Membuka Modul sebelas." },
  { patterns: ["modul dua belas", "modul 12", "materi dua belas", "materi 12", "ab testing", "a b testing"], path: "/dashboard/learn/ab-testing", announce: "Membuka Modul dua belas." },
  { patterns: ["modul tiga belas", "modul 13", "materi tiga belas", "materi 13", "statistika dasar", "statistika"], path: "/dashboard/learn/statistika-dasar", announce: "Membuka Modul tiga belas." },
];

const PATH_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/learn": "Materi",
  "/dashboard/sessions": "Sesi Riset",
  "/dashboard/heatmaps": "Heatmap",
  "/dashboard/researcher": "Researcher",
  "/dashboard/strategist": "Strategist",
  "/dashboard/analyst": "Analyst",
  "/dashboard/reports": "Laporan",
  "/dashboard/learn/ai-orchestration": "Modul satu: Orkestrasi AI",
  "/dashboard/learn/trend-signal": "Modul dua: Deteksi Tren",
  "/dashboard/learn/marketplace-whitespace": "Modul tiga: Whitespace",
  "/dashboard/learn/eye-tracking": "Modul empat: Eye Tracking",
  "/dashboard/learn/llm-copywriting": "Modul lima: Copywriting LLM",
  "/dashboard/learn/content-atomization": "Modul enam: Content Atomization",
  "/dashboard/learn/neuromarketing": "Modul tujuh: Neuromarketing",
  "/dashboard/learn/crisis-management": "Modul delapan: Manajemen Krisis",
  "/dashboard/learn/roi-attribution": "Modul sembilan: Atribusi ROI",
  "/dashboard/learn/ai-ethics": "Modul sepuluh: Etika AI",
  "/dashboard/learn/influencer-dna": "Modul sebelas: Influencer Matching",
  "/dashboard/learn/ab-testing": "Modul dua belas: A/B Testing",
  "/dashboard/learn/statistika-dasar": "Modul tiga belas: Statistika Dasar",
};

// ── Navigation info per page ─────────────────────────────────────────────────
// Describes what navigation options are available from each page
const PAGE_NAV_INFO: Record<string, { items: string[]; hint?: string }> = {
  "/dashboard": {
    items: ["Materi atau Kurikulum", "Sesi Riset", "Researcher", "Strategist", "Analyst", "Heatmaps", "Laporan"],
    hint: "Ucapkan 'buka' diikuti nama halaman, misalnya 'buka materi'.",
  },
  "/dashboard/learn": {
    items: [
      "Modul 1: Orkestrasi AI",
      "Modul 2: Deteksi Tren Dini",
      "Modul 3: Whitespace Marketplace",
      "Modul 4: Psikologi Visual",
      "Modul 5: Copywriting LLM",
      "Modul 6: Content Atomization",
      "Modul 7: Neuromarketing",
      "Modul 8: Manajemen Krisis",
      "Modul 9: Atribusi ROI",
      "Modul 10: Etika AI",
      "Modul 11: Influencer Matching",
      "Modul 12: A/B Testing",
      "Modul 13: Statistika Dasar",
    ],
    hint: "Ucapkan 'modul' diikuti nomornya, misalnya 'modul satu'. Atau ucapkan 'kembali' untuk ke Dashboard.",
  },
  "/dashboard/sessions": {
    items: ["Buat sesi riset baru", "Lihat daftar sesi"],
    hint: "Ucapkan 'mulai riset' untuk membuat sesi baru. Atau 'kembali' untuk ke halaman sebelumnya.",
  },
  "/dashboard/heatmaps": {
    items: ["Lihat data heatmap", "Analisis eye tracking"],
    hint: "Ucapkan 'kembali' untuk ke halaman sebelumnya.",
  },
  "/dashboard/researcher": {
    items: ["Mulai riset dengan AI Researcher"],
    hint: "Kamu bisa bertanya tentang fitur ini. Ucapkan 'kembali' untuk ke halaman sebelumnya.",
  },
  "/dashboard/strategist": {
    items: ["Konsultasi strategi dengan AI Strategist"],
    hint: "Kamu bisa bertanya tentang fitur ini. Ucapkan 'kembali' untuk ke halaman sebelumnya.",
  },
  "/dashboard/analyst": {
    items: ["Analisis data dengan AI Analyst"],
    hint: "Kamu bisa bertanya tentang fitur ini. Ucapkan 'kembali' untuk ke halaman sebelumnya.",
  },
  "/dashboard/reports": {
    items: ["Lihat laporan performa", "Unduh laporan"],
    hint: "Ucapkan 'kembali' untuk ke halaman sebelumnya.",
  },
};

// Build nav info for each learn module (they all share the same nav pattern)
const LEARN_MODULE_PATHS = [
  "/dashboard/learn/ai-orchestration",
  "/dashboard/learn/trend-signal",
  "/dashboard/learn/marketplace-whitespace",
  "/dashboard/learn/eye-tracking",
  "/dashboard/learn/llm-copywriting",
  "/dashboard/learn/content-atomization",
  "/dashboard/learn/neuromarketing",
  "/dashboard/learn/crisis-management",
  "/dashboard/learn/roi-attribution",
  "/dashboard/learn/ai-ethics",
  "/dashboard/learn/influencer-dna",
  "/dashboard/learn/ab-testing",
  "/dashboard/learn/statistika-dasar",
];
for (const p of LEARN_MODULE_PATHS) {
  PAGE_NAV_INFO[p] = {
    items: ["Baca materi modul ini", "Kembali ke daftar Kurikulum"],
    hint: "Ucapkan 'kembali' untuk ke Kurikulum, atau sebut modul lain langsung seperti 'modul dua'.",
  };
}

// Complete lesson list map for all modules to support "bacakan isi modul" voice command
const MODULE_LESSONS: Record<string, string[]> = {
  "ai-orchestration": [
    "Apa itu AI Orchestration?",
    "Anatomi Pipeline Multi-Agent",
    "Dekomposisi Tujuan Bisnis",
    "Quality Gate & Human Oversight",
    "Studi Kasus: Kampanye 48 Jam",
    "Merancang SOP Orkestrasi"
  ],
  "trend-signal": [
    "Noise vs. Sinyal Tren",
    "Velocity & Acceleration Tren",
    "Validasi Lintas Platform",
    "Framework Deteksi Dini"
  ],
  "marketplace-whitespace": [
    "Apa itu Whitespace Marketplace",
    "Matriks Kompetisi vs. Demand",
    "Teknik Mining Keyword Long-Tail",
    "Strategi First-Mover di Celah Pasar"
  ],
  "eye-tracking": [
    "F-Pattern & Z-Pattern",
    "Fixation Points & Saccades",
    "Hierarki Visual untuk Konten",
    "Optimasi Layout Berbasis Data"
  ],
  "llm-copywriting": [
    "Arsitektur Prompt untuk Copywriting",
    "Personalisasi per Segmen Audiens",
    "Viral Hook Engineering",
    "Quality Control Output LLM"
  ],
  "content-atomization": [
    "Prinsip Content Atomization",
    "Satu Ide → Puluhan Format",
    "Platform-Native Adaptation",
    "Workflow Atomisasi dengan AI"
  ],
  "neuromarketing": [
    "Beban Kognitif & Keputusan",
    "Psikologi Warna dalam Marketing",
    "Desain Dashboard yang Efektif",
    "Nudge Theory untuk Konversi"
  ],
  "crisis-management": [
    "Anatomi Krisis Digital",
    "Deteksi Sentimen Real-Time",
    "Framework Respons Empati",
    "Post-Crisis Recovery"
  ],
  "roi-attribution": [
    "Engagement ke Revenue",
    "Model Atribusi",
    "ROAS & Customer Lifetime Value",
    "Dashboard Atribusi untuk Tim"
  ],
  "ai-ethics": [
    "Kenapa Etika AI Penting",
    "Guardrails & Content Filtering",
    "UU PDP & Compliance Digital",
    "Framework Governance AI"
  ],
  "influencer-dna": [
    "Evolusi Influencer Marketing",
    "Vector Search & Semantic Matching",
    "DNA Matching: Vibe, Audiens, Values",
    "Kalkulasi ROI Kolaborasi"
  ],
  "ab-testing": [
    "A/B Testing Tradisional Lambat",
    "Multi-Armed Bandit vs A/B",
    "AI-Driven Creative Iteration",
    "Statistical Significance & Decision"
  ],
  "statistika-dasar": [
    "Mean (Rata-rata)",
    "Median (Nilai Tengah)",
    "Standar Deviasi",
    "Distribusi Data & Histogram",
    "Korelasi & Hubungan Antar Variabel",
    "Outlier & Deteksi Anomali"
  ]
};

/**
 * Build a TTS-friendly announcement of available navigation for a given path.
 * Returns null if no nav info is registered for the path.
 */
function getNavAnnouncement(path: string): string | null {
  const info = PAGE_NAV_INFO[path];
  if (!info) return null;

  const itemList = info.items.length <= 3
    ? info.items.join(", dan ")
    : info.items.slice(0, -1).join(", ") + ", dan " + info.items[info.items.length - 1];

  let msg = `Di halaman ini tersedia: ${itemList}.`;
  if (info.hint) msg += ` ${info.hint}`;
  return msg;
}

// Whisper sometimes returns these for silence — ignore silently
const NOISE_PATTERNS = [
  /^\[.*\]$/, // [Music], [Applause], etc.
  /^terima kasih\.?$/i,
  /^(um+|eh+|ah+|hmm+)\.?$/i,
  /^\.+$/,
  /^\s*$/,
];

// A transcript must contain at least one of these words to be processed
const INTENT_WORDS = [
  "buka", "ke", "modul", "kembali", "ulangi",
  "keluar", "logout", "berhenti", "matikan",
  "dashboard", "materi", "sesi", "riset",
  "heatmap", "researcher", "strategist", "analyst",
  "laporan", "halaman", "di mana", "home",
  // Navigation info intents
  "navigasi", "menu", "daftar", "ada apa", "bisa ke mana",
  // Question intents
  "apa", "ada", "bisa", "jelaskan", "ceritakan",
  "ajarkan", "ajarin", "pelajari", "beritahu", "info",
  "topik", "isi", "mulai belajar", "mulai mengajar",
  "arti", "maksud", "kenapa", "bagaimana", "contoh", "beda",
  "lanjut", "terus", "lagi", "tolong",
  // Form intents
  "pilih", "centang", "target", "fokus", "submit", "ubah", "ganti", "region", "negara"
];

function isNoise(raw: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(raw.trim()));
}

function hasCommandIntent(text: string): boolean {
  return INTENT_WORDS.some((w) => text.includes(w));
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[.,!?;:]/g, "").replace(/\s+/g, " ").trim();
}

// speak utility function is imported from speech-utils

// ── Component ──────────────────────────────────────────────────────────────────
export function SpeechToAction() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { prefs } = useAccessibility(user?.uid);

  const isBlindUser = prefs?.isBlind ?? false;

  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isAsking, setIsAsking] = useState(false); // AI thinking indicator

  const { position, isDragging, dragHandleProps, containerRef } = useDraggable({
    storageKey: "polanitas_speech_pos",
    defaultRight: 32,
    defaultBottom: 32,
  });

  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const chatHistoryRef = useRef<{ role: 'user' | 'assistant', content: string }[]>([]);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoEnabled = useRef(false);

  function showFeedback(msg: string) {
    setFeedback(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 6000);
  }

  // Read prefs after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-enable when we detect the user is blind for the first time
  useEffect(() => {
    if (isBlindUser && !hasAutoEnabled.current) {
      setEnabled(true);
      hasAutoEnabled.current = true;
    }
  }, [isBlindUser]);

  // Announce page on navigation — also reset chat history on page change
  useEffect(() => {
    chatHistoryRef.current = [];
    setChatHistory([]);
    if (!isBlindUser) return;
    const name = PATH_NAMES[pathname] ?? pathname;
    const navInfo = getNavAnnouncement(pathname);
    const announcement = navInfo
      ? `Halaman ${name}. ${navInfo}`
      : `Halaman ${name}. Ucapkan perintah.`;
    const t = setTimeout(() => speak(announcement), 700);
    return () => clearTimeout(t);
  }, [pathname, isBlindUser]);

  // ── Command handler (called after Groq returns transcript) ────────────────
  const handleTranscript = useCallback(
    (raw: string) => {
      // 1. Silently drop Whisper hallucinations & noise
      if (isNoise(raw)) return;

      const text = normalize(raw);

      // 2. Only process if the transcript has clear command intent
      //    Unrelated chatter / background speech → ignored silently
      if (!hasCommandIntent(text)) {
        setLiveTranscript(raw); // show in widget but no feedback/TTS
        return;
      }

      setLiveTranscript(raw);

      // Stop
      if (text.includes("berhenti") || text.includes("matikan")) {
        speak("Dinonaktifkan.");
        showFeedback("🔇 Dinonaktifkan");
        setEnabled(false);
        return;
      }

      // Sign out
      if (text.includes("keluar") || text.includes("logout")) {
        speak("Sampai jumpa!");
        showFeedback("👋 Keluar...");
        setTimeout(() => signOut(), 1200);
        return;
      }

      // Repeat location
      if (text.includes("ulangi") || text.includes("di mana") || text.includes("halaman apa")) {
        const name = PATH_NAMES[pathname] ?? pathname;
        const navInfo = getNavAnnouncement(pathname);
        const msg = navInfo
          ? `Kamu berada di ${name}. ${navInfo}`
          : `Kamu berada di ${name}.`;
        speak(msg);
        showFeedback(`📍 ${name}`);
        return;
      }

      // Navigation info — "apa navigasinya", "ada apa di sini", "bisa ke mana", "menu"
      if (
        text.includes("navigasi") ||
        text.includes("ada apa") ||
        text.includes("bisa ke mana") ||
        (text.includes("menu") && !text.includes("buka")) ||
        (text.includes("daftar") && text.includes("halaman"))
      ) {
        const name = PATH_NAMES[pathname] ?? pathname;
        const navInfo = getNavAnnouncement(pathname);
        if (navInfo) {
          speak(navInfo);
          showFeedback(`🧭 Navigasi: ${name}`);
        } else {
          speak(`Tidak ada informasi navigasi khusus untuk halaman ini. Ucapkan 'kembali' untuk ke halaman sebelumnya.`);
          showFeedback(`🧭 ${name}`);
        }
        return;
      }

      // Check if user wants to hear the lesson list for the active module
      if (
        (text.includes("materi") || text.includes("modul") || text.includes("pelajaran") || text.includes("isi")) &&
        (text.includes("daftar") || text.includes("apa saja") || text.includes("sebutkan") || text.includes("bacakan")) &&
        !text.includes("lengkap")
      ) {
        const moduleId = pathname.split("/").pop();
        if (moduleId && MODULE_LESSONS[moduleId]) {
          const lessons = MODULE_LESSONS[moduleId];
          const lessonList = lessons.map((l, idx) => `Materi ke ${idx + 1}: ${l}`).join(". ");
          const name = PATH_NAMES[pathname] ?? pathname;
          const msg = `Modul ${name} terdiri dari ${lessons.length} materi: ${lessonList}. Ucapkan 'bacakan materi secara lengkap' untuk membaca materi yang sedang aktif.`;
          speak(msg);
          showFeedback(`📚 Daftar Materi: ${name}`);
          return;
        }
      }

      // Back (Special handling: skip if it sounds like lesson navigation)
      if ((text.includes("kembali") || text.includes("sebelumnya")) && !text.includes("materi")) {
        speak("Kembali.");
        showFeedback("← Kembali");
        router.back();
        return;
      }

      // Routes
      for (const { patterns, path, announce } of ROUTE_COMMANDS) {
        if (patterns.some((p) => text.includes(p))) {
          // Jika user sudah berada di halaman tersebut, abaikan perintah navigasi
          // agar ucapan bisa diteruskan ke Form Intent atau Chat Assistant (misal "mulai riset" saat di form)
          if (pathname === path) continue;

          speak(announce);
          showFeedback(`→ ${announce}`);
          router.push(path);
          return;
        }
      }

      // ── Form Intent Check & AI Assistant ──────────────────────────────────
      setIsAsking(true);
      showFeedback("🤔 Sedang memproses...");

      // Coba parse intent form dulu
      parseFormIntent(pathname, raw)
        .then((intent) => {
          if (intent.isFormAction && intent.action) {
            dispatchVoiceFormAction(intent.action);
            if (intent.reply) {
              speak(intent.reply);
              showFeedback(`📝 ${intent.reply}`);
            }
            setIsAsking(false);
          } else {
            // Kalau bukan aksi form, kirim ke asisten tanya-jawab
            speak("Sebentar...");
            return askAboutPage(pathname, raw, chatHistoryRef.current)
              .then(({ answer }) => {
                const updated = [
                  ...chatHistoryRef.current,
                  { role: 'user' as const, content: raw },
                  { role: 'assistant' as const, content: answer },
                ].slice(-10);
                chatHistoryRef.current = updated;
                setChatHistory(updated);
                showFeedback(answer.slice(0, 100) + (answer.length > 100 ? "..." : ""));
                speak(answer);
              });
          }
        })
        .catch(() => {
          speak("Maaf, terjadi kesalahan.");
          showFeedback("❌ Error memproses ucapan");
        })
        .finally(() => setIsAsking(false));
    },
    [pathname, router, signOut]
  );

  // ── Groq Whisper hook ─────────────────────────────────────────────────────
  const { status, errorMsg } = useGroqSpeech({
    enabled,
    onTranscript: handleTranscript,
  });

  if (!mounted) return null;
  if (!isBlindUser) return null;

  const isListening = status === "listening";
  const isProcessing = status === "processing";
  const isError = status === "error";

  return (
    <div
      ref={containerRef}
      className="fixed z-[9990]"
      style={{
        left: position?.x ?? 0,
        top: position?.y ?? 0,
        opacity: position ? 1 : 0,
        transition: isDragging ? 'none' : 'opacity 0.3s ease',
      }}
    >
     <div className="flex flex-col items-end gap-3">

      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="bg-surface border border-border rounded-xl px-4 py-3 shadow-xl max-w-[280px] pointer-events-auto backdrop-blur-xl bg-opacity-95 flex flex-col gap-1"
          >
            <p className="text-sm font-semibold text-primary leading-snug">{feedback}</p>
            {liveTranscript && (
              <p className="text-xs text-muted-foreground italic line-clamp-2">"{liveTranscript}"</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget */}
      <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden w-[100px] md:w-[260px] backdrop-blur-xl bg-opacity-95 transition-all duration-300">
        
        {/* Header — drag handle */}
        <div
          {...dragHandleProps}
          className="flex items-center justify-between px-4 py-3 bg-muted/20 select-none"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0 hidden md:flex">
            <GripVertical size={12} className="text-muted shrink-0 opacity-50" />
            {isAsking ? (
              <Loader2 size={14} className="text-primary animate-spin shrink-0" />
            ) : isError ? (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            ) : isListening ? (
              <motion.span
                className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            ) : isProcessing ? (
              <motion.span
                className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0 shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
            )}

            <span className="text-xs font-semibold text-foreground truncate">
              {isAsking     ? "AI Menjawab..."
              : isError     ? "Mic Error"
              : isListening ? "Mendengarkan..."
              : isProcessing? "Memproses..."
              : enabled     ? "Standby"
              :               "Mic Nonaktif"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle */}
            <button
              onClick={() => {
                const next = !enabled;
                setEnabled(next);
                if (next) speak("Aktif. Siap mendengarkan.");
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border-none outline-none focus:ring-2 focus:ring-primary/50
                ${enabled ? "bg-primary text-[color:var(--color-bg)] shadow-lg shadow-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
              title={enabled ? "Matikan mic" : "Aktifkan mic"}
            >
              {enabled ? <Mic size={14} /> : <MicOff size={14} />}
            </button>

            {/* Collapse */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="w-8 h-8 rounded-full bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center justify-center cursor-pointer border-none outline-none transition-colors"
            >
              {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Expandable body */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-t border-border bg-surface"
            >
              {/* Live transcript */}
              <div className="px-4 py-3 min-h-[44px] flex items-center justify-center">
                {liveTranscript ? (
                  <p className="text-xs text-primary font-medium italic line-clamp-2 w-full text-center">"{liveTranscript}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground w-full text-center">
                    {isListening ? "Ucapkan sesuatu..." : isProcessing ? "Memproses audio..." : "Klik 🎤 untuk mulai"}
                  </p>
                )}
              </div>

              {/* Quick commands (clickable for test) */}
              <div className="px-3 pb-3 flex flex-col gap-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Perintah Cepat</div>
                {["buka dashboard", "buka materi", "sesi riset", "kembali"].map((cmd) => (
                  <button key={cmd} type="button"
                    onClick={() => handleTranscript(cmd)}
                    className="text-left text-xs font-medium text-foreground hover:text-primary transition-all px-3 py-1.5 rounded-md hover:bg-primary/10 border-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                    title="Klik untuk simulasi perintah"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>

              {/* Error */}
              {isError && errorMsg && (
                <div className="mx-4 mb-4 text-xs font-medium text-destructive bg-destructive/10 rounded-lg p-2.5 leading-relaxed">
                  {errorMsg}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
     </div>
    </div>
  );
}
