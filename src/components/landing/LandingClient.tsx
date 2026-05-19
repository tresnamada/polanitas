"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  Search,
  Brain,
  Eye,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Mic,
  ArrowUp,
  Book,
  X,
} from "lucide-react";
import { ThemeLogo } from "@/components/layout/ThemeLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { motion } from "framer-motion";

// ── Animation variants ───────────────────────────────────────────
import { Variants } from "framer-motion";

const customEase = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: customEase },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: customEase },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: customEase },
  },
};

const widthExpand: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: customEase },
  },
};

// ── Features data ────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Search,
    title: "The Researcher",
    desc: "Kumpulkan dan baca data tren secara real-time. Pahami insight konsumen dengan akurat.",
    tag: "Data Scraping",
    color: "#3B82F6",
    href: "/dashboard/researcher",
  },
  {
    Icon: Brain,
    title: "The Strategist",
    desc: "Rancang strategi copywriting viral. Latih pembuatan hook dengan AI terintegrasi.",
    tag: "AI Strategy",
    color: "#8B5CF6",
    href: "/dashboard/strategist",
  },
  {
    Icon: Eye,
    title: "The Analyst",
    desc: "Analisis komprehensif dari hasil data 2 agen sebelumnya, dipadukan dengan evaluasi heatmap visual.",
    tag: "Data & Visual",
    color: "#22C55E",
    href: "/dashboard/analyst",
  },
];

// ── Component ────────────────────────────────────────────────────
export default function LandingClient() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-bg flex flex-col font-sans overflow-x-hidden relative z-0">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <motion.nav
        initial="hidden"
        animate="visible"
        variants={slideDown}
        className="flex items-center justify-between px-10 py-5 fixed top-0 left-0 right-0 z-[100] bg-surface backdrop-blur-[12px] border-b border-border"
      >
        <div className="flex items-center gap-4">
          <ThemeLogo height={24} />
        </div>
        <div className="flex gap-4 items-center">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/login"
              className="btn btn-primary btn-sm rounded-full px-4 py-2 font-semibold"
            >
              Masuk <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center relative z-10 w-full">
        <motion.section
          id="hero"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="min-h-screen w-full max-w-[900px] text-center px-6 flex flex-col items-center justify-center gap-7 py-[80px]"
        >

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-[clamp(2.5rem,5vw,4rem)] tracking-[-0.03em] leading-[1.1] text-primary"
          >
            Bongkar Rahasia Konten Digital dengan
            <br />
            <motion.span
              className="glow-text italic font-extrabold inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Kecerdasan Buatan.
            </motion.span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            custom={2}
            className="max-w-[640px] text-lg text-secondary leading-[1.6]"
          >
            POLANITAS adalah platform edukasi inovatif dan AI Agent untuk Data Analyst yang ramah bagi teman-teman disabilitas. Belajar dan praktik analisis data, riset tren, serta strategi konten menggunakan ekosistem 3 AI Agent spesialis yang terintegrasi.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} custom={3} className="flex gap-4 mt-3 flex-wrap justify-center">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="btn btn-primary btn-lg rounded-md px-8 h-[52px] text-base"
              >
                Coba Eksplorasi
                <Zap size={18} strokeWidth={2.5} />
              </Link>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ── Features ──────────────────────────────────────────── */}
        <motion.section
          id="features"
          className="min-h-screen w-full max-w-[1100px] px-6 flex flex-col justify-center py-[80px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {/* Section label */}
          <motion.div variants={fadeUp} custom={0} className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted mb-3">Ekosistem AI</p>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold text-primary tracking-tight leading-[1.15]">
              Tiga Agen, Satu Tujuan
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, title, desc, tag, color, href }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                custom={i + 1}
                className="group relative flex flex-col justify-between p-8 rounded-[2rem] bg-surface border border-border hover:border-border-2 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {/* Background Accent Glow */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-[0.15] transition-opacity duration-500 blur-2xl rounded-full pointer-events-none"
                  style={{ background: color, transform: 'translate(30%, -30%)' }}
                />

                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-1 group-hover:shadow-sm"
                      style={{ background: `${color}15`, color }}
                    >
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <span className="text-[2.5rem] font-extralight text-border-2 group-hover:text-muted/40 transition-colors duration-300 tabular-nums leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <span className="inline-flex items-center text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted bg-surface-2 border border-border px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-primary tracking-tight mb-3">
                      {title}
                    </h3>
                    <p className="text-secondary text-[0.9375rem] leading-[1.65]">
                      {desc}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-8 pt-6 border-t border-border">
                  <Link href={href} className="w-full flex items-center justify-between group/btn py-2 text-sm font-semibold text-secondary hover:text-primary transition-colors">
                    <span>Mulai Akses</span>
                    <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:border-primary group-hover/btn:text-bg transition-colors">
                      <ArrowRight size={14} strokeWidth={2.5} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Accessibility ──────────────────────────────────────── */}
        <motion.section
          id="accessibility"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="min-h-screen w-full max-w-[960px] px-6 relative z-10 flex flex-col justify-center py-[80px]"
        >
          {/* Illustration */}
          <motion.div variants={fadeUp} custom={0} className="w-full flex flex-col items-center justify-center mb-16">
            <img
              src="/DisabilitasFitur.svg"
              alt="Ilustrasi Fitur Disabilitas"
              className="w-full max-w-[640px] h-auto"
            />
          </motion.div>

          {/* Two-column with vertical divider */}
          <motion.div
            variants={fadeUp}
            custom={1}
            className="w-full grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-10 md:gap-12"
          >
            {/* Voice-to-Action */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <Mic size={20} strokeWidth={1.5} className="text-[var(--color-accent-text)] shrink-0" />
                <h4 className="text-lg font-semibold text-primary tracking-tight">Voice-to-Action</h4>
              </div>
              <p className="text-secondary leading-[1.75] text-[0.9375rem]">
                Bagi teman-teman <span className="text-primary font-medium">tunanetra atau yang memiliki gangguan penglihatan</span>, POLANITAS menghadirkan asisten AI suara. Cukup berbicara untuk menavigasi halaman, mengisi form riset, dan mendengarkan penjelasan materi langsung dari AI.
              </p>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block bg-border" />

            {/* Eye Tracking */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <Eye size={20} strokeWidth={1.5} className="text-[#8B5CF6] shrink-0" />
                <h4 className="text-lg font-semibold text-primary tracking-tight">Eye Tracking Navigation</h4>
              </div>
              <p className="text-secondary leading-[1.75] text-[0.9375rem]">
                Bagi teman-teman <span className="text-primary font-medium">dengan disabilitas fisik/tangan</span>, POLANITAS mendukung navigasi otomatis lewat tatapan mata (<em>Dwell Click</em>) atau kedipan mata (<em>Blink Click</em>) untuk kemudahan akses penuh tanpa menggunakan mouse atau keyboard.
              </p>
            </div>
          </motion.div>
          <button 
            onClick={() => setIsGuideOpen(true)}
            className="btn btn-secondary rounded-full flex items-center gap-2 mb-10 shadow-sm mt-12"
          >
            <Book size={16} /> Panduan Aksesibilitas
          </button>
        </motion.section>
      </main>

      {/* ── Accessibility Guide Modal ─────────────────────────── */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface border border-border p-8 rounded-2xl shadow-xl max-w-lg w-full relative"
          >
            <button onClick={() => setIsGuideOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-surface-2 rounded-full text-muted hover:text-primary transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/20 text-[var(--color-accent-text)] flex items-center justify-center">
                <Book size={20} />
              </div>
              <h3 className="text-xl font-bold text-primary">Panduan Penggunaan</h3>
            </div>
            
            <div className="flex flex-col gap-5 text-secondary text-[0.9375rem] leading-[1.6]">
              <p>
                <strong className="text-primary block mb-1">1. Saat Pendaftaran (Register)</strong>
                Anda dapat memilih fitur aksesibilitas yang dibutuhkan (Tunanetra / Disabilitas Fisik) pada saat membuat akun baru. Sistem akan secara otomatis menyesuaikan antarmuka untuk Anda.
              </p>
              <p>
                <strong className="text-primary block mb-1">2. Voice-to-Action</strong>
                Gunakan perintah suara untuk menavigasi, menjalankan agen AI, dan mendengarkan penjelasan analitik tanpa harus menyentuh keyboard.
              </p>
              <p>
                <strong className="text-primary block mb-1">3. Eye Tracking</strong>
                Berikan akses kamera untuk menggerakkan kursor dengan mata Anda. Gunakan kedipan (Blink) atau tahan tatapan (Dwell) untuk mengklik elemen pada layar.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <Link href="/register" className="btn btn-primary px-6 rounded-lg">
                Daftar Sekarang
              </Link>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-8 px-10 flex justify-between items-center flex-wrap gap-4 bg-surface border-t border-border"
      >
        <div className="flex items-center gap-3">
          <ThemeLogo height={16} />
          <span className="text-[0.85rem] text-muted">© 2026. All rights reserved.</span>
        </div>
      </motion.footer>

      {/* ── Floating Actions ───────────────────────────────────── */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 items-center">
        <ThemeToggle />
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary shadow-md hover:bg-surface-2 transition-all hover:-translate-y-1"
          aria-label="Kembali ke atas"
        >
          <ArrowUp size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
