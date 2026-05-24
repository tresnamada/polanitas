"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  PlayCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveUserProfile, UserProfile } from "@/hooks/use-accessibility";

// ── Types ─────────────────────────────────────────────────────────────────────
type Gender = "male" | "female" | "other";
type Step = 1 | 2 | 3;

const PLATFORMS = [
  { id: "tiktok",    label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube",   label: "YouTube" },
  { id: "shopee",    label: "Shopee" },
  { id: "tokopedia", label: "Tokopedia" },
  { id: "twitter",   label: "X / Twitter" },
  { id: "linkedin",  label: "LinkedIn" },
  { id: "facebook",  label: "Facebook" },
];

const STEP_LABELS = ["Siapa kamu?", "Platform kamu?", "Kebutuhan khusus?"];

const ease = [0.22, 1, 0.36, 1] as const;

// ── Voice Commands reference list ─────────────────────────────────────────────
const VOICE_COMMANDS = [
  {
    category: "Navigasi Halaman",
    commands: [
      { phrase: "buka dashboard",     desc: "Pergi ke halaman utama" },
      { phrase: "buka materi",        desc: "Buka daftar semua modul" },
      { phrase: "buka sesi riset",    desc: "Mulai atau lihat sesi AI" },
      { phrase: "buka heatmap",       desc: "Buka halaman eye tracking" },
      { phrase: "kembali",            desc: "Kembali ke halaman sebelumnya" },
    ],
  },
  {
    category: "Modul Pembelajaran",
    commands: [
      { phrase: "modul satu",         desc: "Buka Orkestrasi AI" },
      { phrase: "modul dua",          desc: "Buka Deteksi Tren Dini" },
      { phrase: "modul tiga",         desc: "Buka Whitespace Marketplace" },
      { phrase: "modul empat",        desc: "Buka Eye Tracking Mastery" },
      { phrase: "modul lima",         desc: "Buka Copywriting LLM" },
    ],
  },
  {
    category: "Kontrol Umum",
    commands: [
      { phrase: "mulai riset",        desc: "Jalankan sesi riset baru" },
      { phrase: "keluar",             desc: "Logout dari akun" },
      { phrase: "berhenti mendengar", desc: "Matikan pengenalan suara" },
      { phrase: "ulangi",             desc: "Baca ulang konten halaman ini" },
    ],
  },
];

const INTRO_SCRIPT = `Halo! Selamat datang di POLANITAS. 
Kamu baru saja mengaktifkan fitur Speech to Action. 
Kamu bisa memberikan perintah suara kapan saja. 
Contohnya: ucapkan "buka dashboard" untuk pergi ke halaman utama. 
Atau ucapkan "modul satu" untuk langsung membuka modul Orkestrasi AI. 
Ucapkan "berhenti mendengar" jika ingin menonaktifkan sementara. 
Sekarang, mari kita selesaikan pengaturan profilmu.`;

// ── Speech utility ────────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "id-ID";
  utt.rate = 0.95;
  utt.pitch = 1;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

interface Props {
  uid: string;
  initialName?: string;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfileSetupForm({ uid, initialName = "" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [dir, setDir] = useState(1);

  const [name, setName] = useState(initialName);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isBlind, setIsBlind] = useState(false);
  const [hasHandDisability, setHasHandDisability] = useState(false);

  // Speech tutorial state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // ── Toggle blindness with auto-play intro ─────────────────────────────────
  function handleBlindToggle() {
    const next = !isBlind;
    setIsBlind(next);
    if (next && !hasPlayedIntro) {
      setIsSpeaking(true);
      setHasPlayedIntro(true);
      speak(INTRO_SCRIPT, () => setIsSpeaking(false));
    } else if (!next) {
      stopSpeaking();
      setIsSpeaking(false);
    }
  }

  function handleReplayIntro() {
    setIsSpeaking(true);
    speak(INTRO_SCRIPT, () => setIsSpeaking(false));
  }

  function handleSpeakCommand(text: string) {
    speak(`Perintah: ${text}`);
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function validateStep1() {
    if (!name.trim()) return "Nama tidak boleh kosong.";
    if (!age || isNaN(Number(age)) || Number(age) < 13 || Number(age) > 99)
      return "Masukkan usia yang valid (13–99).";
    if (!gender) return "Pilih satu opsi jenis kelamin.";
    return null;
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    } else if (step === 2) {
      if (platforms.length === 0) { setError("Pilih minimal satu platform."); return; }
    }
    setDir(1);
    setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    setError(null);
    stopSpeaking();
    setIsSpeaking(false);
    setDir(-1);
    setStep((s) => (s - 1) as Step);
  }

  function handleSubmit() {
    setError(null);
    stopSpeaking();
    startTransition(async () => {
      try {
        const profile: UserProfile = {
          name: name.trim(),
          age: Number(age),
          gender: gender as Gender,
          platforms,
          accessibility: { isBlind, hasHandDisability },
          profileCompleted: true,
        };
        await saveUserProfile(uid, profile);
        localStorage.setItem(
          "polanitas_accessibility",
          JSON.stringify({ isBlind, hasHandDisability })
        );
        if (isBlind) {
          speak("Profil berhasil disimpan. Selamat datang di POLANITAS!");
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Gagal menyimpan profil. Coba lagi.");
      }
    });
  }

  const slideVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 32 : -32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -32 : 32 }),
  };

  return (
    <div className="w-full max-w-[480px] mx-auto">

      {/* ── Progress bar ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">{step} / 3</span>
          <span className="text-xs text-muted">{STEP_LABELS[step - 1]}</span>
        </div>
        <div className="flex gap-1.5">
          {([1, 2, 3] as Step[]).map((n) => (
            <div key={n} className="flex-1 h-[3px] rounded-full overflow-hidden bg-border">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: step >= n ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Card ──────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>

          {/* ── Step 1 ─────────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease }} className="p-7 flex flex-col gap-6"
            >
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight mb-1">Kenalkan dirimu</h2>
                <p className="text-sm text-muted">Data ini hanya untuk personalisasi pengalamanmu.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ps-name" className="text-xs font-semibold text-secondary uppercase tracking-wider">Nama</label>
                <input id="ps-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="input" placeholder="Nama kamu" autoComplete="name" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ps-age" className="text-xs font-semibold text-secondary uppercase tracking-wider">Usia</label>
                <input id="ps-age" type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  className="input" placeholder="Contoh: 22" min={13} max={99} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Jenis Kelamin</label>
                <div className="flex rounded-xl overflow-hidden border border-border">
                  {(["male", "female", "other"] as Gender[]).map((g, i) => {
                    const labels = { male: "Laki-laki", female: "Perempuan", other: "Lainnya" };
                    const active = gender === g;
                    return (
                      <button key={g} type="button" onClick={() => setGender(g)}
                        className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 font-sans border-none cursor-pointer
                          ${i > 0 ? "border-l border-border" : ""}
                          ${active ? "bg-primary text-[color:var(--color-bg)]" : "bg-surface text-secondary hover:bg-surface-2"}`}>
                        {labels[g]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2 ─────────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease }} className="p-7 flex flex-col gap-5"
            >
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight mb-1">Platform yang kamu analisis</h2>
                <p className="text-sm text-muted">Pilih satu atau lebih.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ id, label }) => {
                  const active = platforms.includes(id);
                  return (
                    <button key={id} type="button" onClick={() => togglePlatform(id)}
                      className={`py-1.5 px-3.5 rounded-full text-sm font-semibold transition-all duration-150 font-sans border cursor-pointer
                        ${active ? "bg-primary text-[color:var(--color-bg)] border-primary" : "bg-surface text-secondary border-border hover:border-primary/40"}`}>
                      {active && <Check size={11} strokeWidth={3} className="inline mr-1.5 -mt-0.5" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Step 3 ─────────────────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease }} className="p-7 flex flex-col gap-5"
            >
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight mb-1">Ada kebutuhan khusus?</h2>
                <p className="text-sm text-muted leading-relaxed">
                  Pilih jika berlaku. Ini mengaktifkan fitur aksesibilitas khusus.
                </p>
              </div>

              {/* Hand disability toggle */}
              <div onClick={() => setHasHandDisability((v) => !v)}
                className="flex items-center justify-between p-4 rounded-xl cursor-pointer bg-surface-2 transition-opacity duration-200 hover:opacity-100"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-semibold text-primary mb-0.5">Keterbatasan gerak tangan</p>
                  <p className="text-xs text-muted">Aktifkan Eye Tracking — navigasi lewat gerakan mata.</p>
                </div>
                <div className={`w-11 h-6 rounded-full shrink-0 relative transition-colors duration-200 ${hasHandDisability ? "bg-primary" : "bg-border"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${hasHandDisability ? "left-6" : "left-1"}`} />
                </div>
              </div>

              {/* Blindness toggle */}
              <div>
                <div onClick={handleBlindToggle}
                  className="flex items-center justify-between p-4 rounded-xl cursor-pointer bg-surface-2 transition-all duration-200"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-semibold text-primary mb-0.5">Gangguan penglihatan</p>
                    <p className="text-xs text-muted">Aktifkan Speech-to-Action — perintah suara & pembacaan konten.</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full shrink-0 relative transition-colors duration-200 ${isBlind ? "bg-primary" : "bg-border"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${isBlind ? "left-6" : "left-1"}`} />
                  </div>
                </div>

                {/* ── Voice command tutorial panel ────────────────── */}
                <AnimatePresence>
                  {isBlind && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 rounded-xl border border-border bg-bg overflow-hidden">

                        {/* Header */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                          <div className="flex items-center gap-2">
                            {isSpeaking ? (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                              >
                                <Volume2 size={14} className="text-primary" />
                              </motion.div>
                            ) : (
                              <VolumeX size={14} className="text-muted" />
                            )}
                            <span className="text-xs font-bold text-primary">
                              {isSpeaking ? "Sedang membacakan panduan..." : "Panduan Perintah Suara"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleReplayIntro}
                            disabled={isSpeaking}
                            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors font-semibold font-sans bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <PlayCircle size={13} />
                            {isSpeaking ? "Memutar..." : "Putar ulang"}
                          </button>
                        </div>

                        {/* Intro description */}
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-xs text-secondary leading-relaxed">
                            Aktifkan mikrofon dan ucapkan salah satu perintah di bawah ini kapan saja.
                            Sistem akan menavigasi atau membacakan konten secara otomatis.
                          </p>
                        </div>

                        {/* Commands accordion */}
                        <div className="divide-y divide-border">
                          {VOICE_COMMANDS.map(({ category, commands }) => (
                            <div key={category}>
                              <button
                                type="button"
                                onClick={() => setOpenCategory(openCategory === category ? null : category)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left font-sans bg-transparent border-none cursor-pointer hover:bg-surface-2 transition-colors"
                              >
                                <span className="text-xs font-bold text-primary uppercase tracking-wider">{category}</span>
                                <motion.div
                                  animate={{ rotate: openCategory === category ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown size={13} className="text-muted" />
                                </motion.div>
                              </button>

                              <AnimatePresence>
                                {openCategory === category && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3 flex flex-col gap-1.5">
                                      {commands.map(({ phrase, desc }) => (
                                        <button
                                          key={phrase}
                                          type="button"
                                          onClick={() => handleSpeakCommand(phrase)}
                                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface hover:bg-surface-2 transition-colors text-left w-full border-none cursor-pointer font-sans group"
                                          title="Klik untuk mendengar"
                                        >
                                          <div>
                                            <span className="text-xs font-bold text-primary font-mono">
                                              &ldquo;{phrase}&rdquo;
                                            </span>
                                            <p className="text-[10px] text-muted mt-0.5">{desc}</p>
                                          </div>
                                          <Volume2
                                            size={12}
                                            className="text-muted group-hover:text-primary transition-colors shrink-0 ml-2"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>

                        {/* Footer note */}
                        <div className="px-4 py-2.5 bg-surface-2 border-t border-border">
                          <p className="text-[10px] text-muted text-center">
                            Klik tiap perintah untuk mendengar contoh pengucapannya 🔊
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-xs text-muted text-center">
                Tidak ada yang berlaku? Biarkan keduanya mati dan lanjut.
              </p>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-7 mb-1 flex items-center gap-2 py-2 px-3 text-sm text-error overflow-hidden"
            >
              <AlertCircle size={13} className="shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer nav ──────────────────────────────────────────── */}
        <div className="px-7 pb-7 flex gap-2.5">
          {step > 1 && (
            <button type="button" onClick={goBack}
              className="btn btn-secondary py-2.5 px-4 flex items-center gap-1.5">
              <ArrowLeft size={14} /> Kembali
            </button>
          )}

          {step < 3 ? (
            <button type="button" onClick={goNext}
              className="btn btn-primary flex-1 justify-center py-2.5 flex items-center gap-1.5">
              Lanjut <ArrowRight size={14} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isPending}
              className="btn btn-primary flex-1 justify-center py-2.5 flex items-center gap-1.5">
              {isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="flex items-center justify-center"
                  >
                    <Loader2 size={15} strokeWidth={2.5} />
                  </motion.div>
                  Memproses...
                </>
              ) : (
                <>
                  Selesai & Mulai
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
