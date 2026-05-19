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
};

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

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "id-ID";
  utt.rate = 0.92;
  window.speechSynthesis.speak(utt);
}

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
    if (!enabled || !isBlindUser) return;
    const name = PATH_NAMES[pathname] ?? pathname;
    const t = setTimeout(() => speak(`Halaman ${name}. Ucapkan perintah.`), 700);
    return () => clearTimeout(t);
  }, [pathname, enabled, isBlindUser]);

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

      // Repeat
      if (text.includes("ulangi") || text.includes("di mana") || text.includes("halaman apa")) {
        const name = PATH_NAMES[pathname] ?? pathname;
        speak(`Kamu berada di ${name}.`);
        showFeedback(`📍 ${name}`);
        return;
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
