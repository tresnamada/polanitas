"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { createSession } from "@/actions/auth-actions";
import { isProfileCompleted } from "@/hooks/use-accessibility";
import { Mail, Lock, LogIn, AlertCircle, Globe, Loader2 } from "lucide-react";
import { ThemeLogo } from "@/components/layout/ThemeLogo";
import { motion, AnimatePresence } from "framer-motion";

const googleProvider = new GoogleAuthProvider();

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") ?? "/dashboard";

  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Email / Password Login ──────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    startTransition(async () => {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const result = await createSession(cred.user.uid);
        if (result?.error) throw new Error(result.error);
        const profileDone = await isProfileCompleted(cred.user.uid);
        router.push(profileDone ? redirectTo : "/setup-profile");
        router.refresh();
      } catch (err: any) {
        setError(friendlyError(err.code ?? err.message));
      }
    });
  }

  // ── Google Login ────────────────────────────────────────────
  async function handleGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const result = await createSession(cred.user.uid);
      if (result?.error) throw new Error(result.error);
      const profileDone = await isProfileCompleted(cred.user.uid);
      router.push(profileDone ? redirectTo : "/setup-profile");
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[420px]"
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
            Masuk ke Akun
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-secondary"
          >
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-accent-text font-semibold hover:underline"
            >
              Daftar gratis
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
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label htmlFor="login-email" className="label">
              Email
            </label>
            <div className="relative">
              <Mail
                size={15}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
              <input
                id="login-email"
                name="email"
                type="email"
                className="input pl-9"
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="login-password" className="label m-0">
                Password
              </label>
              <a href="#" className="text-[0.8125rem] text-accent-text font-medium hover:underline">
                Lupa password?
              </a>
            </div>
            <div className="relative">
              <Lock
                size={15}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
              <input
                id="login-password"
                name="password"
                type="password"
                className="input pl-9"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary mt-2 w-full justify-center py-3 shadow-[0_4px_12px_var(--color-accent-glow)]"
            disabled={loading}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="flex items-center justify-center"
              >
                <Loader2 size={15} strokeWidth={2.5} />
              </motion.div>
            ) : (
              <LogIn size={15} strokeWidth={2.5} />
            )}
            {isPending ? "Memproses..." : "Masuk"}
          </motion.button>
        </form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-3 my-6"
        >
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted whitespace-nowrap">
            atau masuk dengan
          </span>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

        {/* Google Sign In */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.02, backgroundColor: "var(--color-surface-3)" }}
          whileTap={{ scale: 0.98 }}
          id="login-google-btn"
          onClick={handleGoogle}
          disabled={loading}
          className="btn btn-secondary w-full justify-center py-3"
        >
          <Globe size={15} strokeWidth={2} />
          {isGooglePending ? "Membuka Google..." : "Lanjutkan dengan Google"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// Map Firebase error codes to user-friendly Indonesian messages
function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found": "Email tidak terdaftar. Coba daftar terlebih dahulu.",
    "auth/wrong-password": "Password salah. Silakan coba lagi.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba beberapa menit lagi.",
    "auth/network-request-failed": "Koneksi gagal. Periksa jaringan kamu.",
    "auth/user-disabled": "Akun ini telah dinonaktifkan.",
  };
  return map[code] ?? `Terjadi kesalahan: ${code}`;
}
