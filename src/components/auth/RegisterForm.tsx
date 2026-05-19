"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { createSession } from "@/actions/auth-actions";
import { Mail, Lock, User, UserPlus, AlertCircle, Globe, CheckCircle } from "lucide-react";
import { ThemeLogo } from "@/components/layout/ThemeLogo";
import { motion, AnimatePresence } from "framer-motion";

const googleProvider = new GoogleAuthProvider();

export default function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // ── Password strength indicator ────────────────────────────
  function checkStrength(pwd: string) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    setPasswordStrength(score);
  }

  // ── Email / Password Register ───────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (password !== confirm) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    startTransition(async () => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const result = await createSession(cred.user.uid);
        if (result?.error) throw new Error(result.error);
        router.push("/setup-profile");
        router.refresh();
      } catch (err: any) {
        setError(friendlyError(err.code ?? err.message));
      }
    });
  }

  // ── Google Register ─────────────────────────────────────────
  async function handleGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const result = await createSession(cred.user.uid);
      if (result?.error) throw new Error(result.error);
      router.push("/setup-profile");
      router.refresh();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(friendlyError(err.code ?? err.message));
      }
    } finally {
      setGooglePending(false);
    }
  }

  const loading = isPending || isGooglePending;

  const strengthColors = ["", "#EF4444", "#F59E0B", "#3B82F6", "#22C55E"];
  const strengthLabels = ["", "Lemah", "Cukup", "Kuat", "Sangat Kuat"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[460px] my-8"
    >
      <div className="bg-surface p-8 rounded-3xl border border-border shadow-md">
        {/* Header */}
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center mb-4"
          >
            <ThemeLogo height={32} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-1.5 text-xl font-bold"
          >
            Buat Akun Baru
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-secondary"
          >
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-accent-text font-semibold hover:underline"
            >
              Masuk di sini
            </Link>
          </motion.p>
        </div>

        {/* Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="flex items-start gap-2 py-2.5 px-3.5 bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)] rounded-[var(--radius-sm)] text-sm text-error overflow-hidden"
            >
              <AlertCircle size={15} strokeWidth={2} className="shrink-0 mt-px" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <label htmlFor="reg-name" className="label">Nama Lengkap</label>
            <div className="relative">
              <User
                size={15}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
              <input
                id="reg-name"
                name="name"
                type="text"
                className="input pl-9"
                placeholder="Nama kamu"
                required
                autoComplete="name"
              />
            </div>
          </motion.div>

          {/* Email */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <label htmlFor="reg-email" className="label">Email</label>
            <div className="relative">
              <Mail
                size={15}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
              <input
                id="reg-email"
                name="email"
                type="email"
                className="input pl-9"
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <Lock
                size={15}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
              <input
                id="reg-password"
                name="password"
                type="password"
                className="input pl-9"
                placeholder="Min. 6 karakter"
                required
                minLength={6}
                autoComplete="new-password"
                onChange={(e) => checkStrength(e.target.value)}
              />
            </div>

            {/* Password strength bar */}
            <AnimatePresence>
              {passwordStrength > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-2"
                >
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map((lvl) => (
                      <motion.div
                        key={lvl}
                        className="flex-1 h-[3px] rounded-full transition-colors duration-300"
                        style={{
                          background: lvl <= passwordStrength
                            ? (strengthColors[passwordStrength] ?? "var(--color-border)")
                            : "var(--color-border)",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="caption font-bold"
                    style={{ color: strengthColors[passwordStrength] }}
                  >
                    Password {strengthLabels[passwordStrength]}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Confirm Password */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
            <label htmlFor="reg-confirm" className="label">Konfirmasi Password</label>
            <div className="relative">
              <Lock
                size={15}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
              <input
                id="reg-confirm"
                name="confirm"
                type="password"
                className="input pl-9"
                placeholder="Ulangi password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </motion.div>

          {/* Terms */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-[0.8125rem] text-muted leading-[1.6]">
            Dengan mendaftar, kamu menyetujui{" "}
            <a href="#" className="text-accent-text font-medium hover:underline">Ketentuan Layanan</a>{" "}
            dan{" "}
            <a href="#" className="text-accent-text font-medium hover:underline">Kebijakan Privasi</a> kami.
          </motion.p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary w-full justify-center py-3 shadow-[0_4px_12px_var(--color-accent-glow)]"
            disabled={loading}
          >
            <UserPlus size={15} strokeWidth={2.5} />
            {isPending ? "Membuat akun..." : "Buat Akun"}
          </motion.button>
        </form>

        {/* Divider */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted whitespace-nowrap">
            atau daftar dengan
          </span>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

        {/* Google */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: "var(--color-surface-3)" }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          id="register-google-btn"
          onClick={handleGoogle}
          disabled={loading}
          className="btn btn-secondary w-full justify-center py-3"
        >
          <Globe size={15} strokeWidth={2} />
          {isGooglePending ? "Membuka Google..." : "Daftar dengan Google"}
        </motion.button>
      </div>

    </motion.div>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "Email sudah digunakan. Coba masuk atau gunakan email lain.",
    "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/network-request-failed": "Koneksi gagal. Periksa jaringan kamu.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba beberapa menit lagi.",
  };
  return map[code] ?? `Terjadi kesalahan: ${code}`;
}
