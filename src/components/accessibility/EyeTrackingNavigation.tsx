"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAccessibility } from "@/hooks/use-accessibility";
import { useFaceTracker } from "@/hooks/use-face-tracker";
import { useDraggable } from "@/hooks/use-draggable";
import {
  Eye, EyeOff, ChevronUp, ChevronDown,
  Loader2, GripVertical, AlertCircle, Video, RefreshCw,
  Move, MousePointerClick, ArrowUp, ArrowDown, Check, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ─────────────────────────────────────────────────────────────────
const CURSOR_HALF      = 20;   // half of cursor dot width/height (px)
const SCROLL_ZONE_FRAC = 0.16; // top/bottom 16% of viewport = scroll trigger zone
const SCROLL_SPEED_PX  = 20;   // max px to scroll per tick
const SCROLL_TICK_MS   = 40;   // scroll update rate (~25fps)

/**
 * Find the nearest scrollable ancestor element or fall back to documentElement.
 * Required for Next.js App Router where the scrollable container may be an
 * inner div, not the window or html element.
 */
function findScrollContainer(x: number, y: number): Element {
  const midY = window.innerHeight / 2;
  // Walk up from the element at (x, midY) to find a scrollable ancestor
  let el = document.elementFromPoint(x < 0 ? window.innerWidth / 2 : x, midY);
  while (el && el !== document.documentElement) {
    const style  = window.getComputedStyle(el);
    const ovfY   = style.overflowY;
    const ovf    = style.overflow;
    const canScrollY = (ovfY === "auto" || ovfY === "scroll" || ovf === "auto" || ovf === "scroll");
    if (canScrollY && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return document.documentElement;
}

// ── CSS injected when tracker is active ──────────────────────────────────────
const PREVIEW_CSS = `
#ftPreviewVideo {
  position: fixed !important;
  bottom: 100px !important;
  right: 16px !important;
  width: 200px !important;
  height: auto !important;
  border-radius: 14px !important;
  z-index: 9985 !important;
  transform: scaleX(-1) !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45) !important;
  border: 2px solid rgba(99,102,241,0.5) !important;
  object-fit: cover !important;
  display: block !important;
  background: #000 !important;
}
`;

export function EyeTrackingNavigation() {
  const { user }  = useAuth();
  const { prefs } = useAccessibility(user?.uid);
  const hasHandDisability = prefs?.hasHandDisability ?? false;

  const [enabled,   setEnabled]   = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { position, isDragging, dragHandleProps, containerRef } = useDraggable({
    storageKey:    "polanitas_eyetracking_pos",
    defaultRight:  32,
    defaultBottom: 96,
  });

  // ── Gaze cursor state ─────────────────────────────────────────────────────
  const [cursorPos,  setCursorPos]  = useState({ x: -1, y: -1 });
  const [blinkFlash, setBlinkFlash] = useState(false);
  const cursorRef = useRef({ x: -1, y: -1 });

  // ── Scroll zone state ─────────────────────────────────────────────────────
  const [scrollDir,  setScrollDir]  = useState<"up" | "down" | "none">("none");
  const scrollDirRef = useRef<"up" | "down" | "none">("none");

  // ── Feedback toast ────────────────────────────────────────────────────────
  const [feedback,     setFeedback]     = useState<string | null>(null);
  const [feedbackIcon, setFeedbackIcon] = useState<ReactNode>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFeedback(msg: string, icon?: ReactNode) {
    setFeedback(msg);
    setFeedbackIcon(icon ?? null);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      setFeedbackIcon(null);
    }, 2500);
  }

  // ── Inject / remove preview video CSS ────────────────────────────────────
  const styleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    if (enabled) {
      if (!styleRef.current) {
        const el = document.createElement("style");
        el.id          = "ft-preview-css";
        el.textContent = PREVIEW_CSS;
        document.head.appendChild(el);
        styleRef.current = el;
      }
    } else {
      styleRef.current?.remove();
      styleRef.current = null;
      const prev = document.getElementById("ftPreviewVideo");
      if (prev) prev.style.setProperty("display", "none", "important");
    }
  }, [enabled]);
  useEffect(() => () => { styleRef.current?.remove(); }, []);

  // ── Gaze handler — move cursor + detect scroll zone ───────────────────────
  const handleGaze = useCallback((x: number, y: number) => {
    cursorRef.current = { x, y };
    setCursorPos({ x, y });

    // Check which scroll zone (if any) the cursor is in
    const yRatio = y / window.innerHeight;
    let dir: "up" | "down" | "none" = "none";
    if (yRatio < SCROLL_ZONE_FRAC)          dir = "up";
    else if (yRatio > 1 - SCROLL_ZONE_FRAC) dir = "down";

    if (dir !== scrollDirRef.current) {
      scrollDirRef.current = dir;
      setScrollDir(dir);
    }
  }, []);

  // ── Blink handler — click element under cursor ────────────────────────────
  const handleBlink = useCallback(() => {
    const { x, y } = cursorRef.current;
    if (x < 0 || y < 0) return;

    setBlinkFlash(true);
    setTimeout(() => setBlinkFlash(false), 300);

    const el = document.elementFromPoint(x, y);
    if (el && el.tagName !== "BODY" && el.tagName !== "HTML") {
      const htmlEl = el as HTMLElement;
      const old    = htmlEl.style.outline;
      htmlEl.style.outline = "3px solid var(--color-primary)";
      setTimeout(() => { htmlEl.style.outline = old; }, 300);
      htmlEl.click();
      showFeedback("Klik Kedip", <MousePointerClick size={14} />);
    }
  }, []);

  const {
    isReady, isTracking, isFaceDetected, isCalibrating,
    error, debugEAR, startTracking, stopTracking, recalibrate,
  } = useFaceTracker(handleGaze, handleBlink);

  useEffect(() => { setMounted(true); }, []);

  // ── Start / stop tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (enabled && isReady && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
      setCursorPos({ x: -1, y: -1 });
      cursorRef.current    = { x: -1, y: -1 };
      scrollDirRef.current = "none";
      setScrollDir("none");
    }
  }, [enabled, isReady, isTracking, startTracking, stopTracking]);

  // ── Scroll loop — fires every SCROLL_TICK_MS when cursor is in a scroll zone ──
  useEffect(() => {
    if (!enabled || !isTracking) {
      scrollDirRef.current = "none";
      setScrollDir("none");
      return;
    }

    const tick = () => {
      const dir = scrollDirRef.current;
      if (dir === "none") return;

      const { x, y } = cursorRef.current;
      const yRatio   = y / window.innerHeight;

      // Intensity: 0 at zone boundary, 1 at screen edge — faster toward edge
      const intensity =
        dir === "up"
          ? Math.max(0, (SCROLL_ZONE_FRAC - yRatio) / SCROLL_ZONE_FRAC)
          : Math.max(0, (yRatio - (1 - SCROLL_ZONE_FRAC)) / SCROLL_ZONE_FRAC);

      const amount = Math.round(SCROLL_SPEED_PX * intensity);
      if (amount === 0) return;

      const delta = dir === "up" ? -amount : amount;
      console.log(`[Scroll] dir=${dir} y=${Math.round(y)} ratio=${yRatio.toFixed(2)} intensity=${intensity.toFixed(2)} delta=${delta}`);

      // Primary: window.scrollBy — works in most browser/Next.js configs
      window.scrollBy(0, delta);

      // Secondary: walk DOM to find the actual scrollable container
      // (covers Next.js App Router layouts with overflow:auto inner divs)
      const container = findScrollContainer(x, y);
      if (container !== document.documentElement) {
        // Only use container scroll if it's NOT the html element (would double-scroll)
        container.scrollTop += delta;
      }
    };

    const id = setInterval(tick, SCROLL_TICK_MS);
    return () => clearInterval(id);
  }, [enabled, isTracking]);

  if (!mounted) return null;
  if (!hasHandDisability) return null;

  const showCursor = enabled && isTracking && !isCalibrating && cursorPos.x >= 0 && cursorPos.y >= 0;

  const statusLabel = !isReady
    ? "Memuat FaceMesh..."
    : isCalibrating
    ? "Kalibrasi posisi..."
    : isTracking
    ? isFaceDetected ? "Wajah Terdeteksi" : "Mencari Wajah..."
    : "Tracker Nonaktif";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Scroll zone overlays — appear at screen edges ──────────────────── */}
      <AnimatePresence>
        {showCursor && scrollDir === "up" && (
          <motion.div
            key="scroll-up"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none
                       flex items-start justify-center pt-3"
            style={{
              height:     `${SCROLL_ZONE_FRAC * 100}vh`,
              background: "linear-gradient(to bottom, rgba(99,102,241,0.22), transparent)",
            }}
          >
            <motion.div
              animate={{ y: [-5, 0, -5] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1 text-primary drop-shadow-lg"
            >
              <ArrowUp size={26} strokeWidth={2.5} />
              <span className="text-[11px] font-bold tracking-widest uppercase">Scroll Atas</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCursor && scrollDir === "down" && (
          <motion.div
            key="scroll-down"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none
                       flex items-end justify-center pb-3"
            style={{
              height:     `${SCROLL_ZONE_FRAC * 100}vh`,
              background: "linear-gradient(to top, rgba(99,102,241,0.22), transparent)",
            }}
          >
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1 text-primary drop-shadow-lg"
            >
              <span className="text-[11px] font-bold tracking-widest uppercase">Scroll Bawah</span>
              <ArrowDown size={26} strokeWidth={2.5} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Gaze Cursor ──────────────────────────────────────────────────────── */}
      {showCursor && (
        <div
          className="fixed z-[10001] pointer-events-none top-0 left-0"
          style={{
            transform:  `translate3d(${cursorPos.x - CURSOR_HALF}px, ${cursorPos.y - CURSOR_HALF}px, 0)`,
            transition: "none",
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: CURSOR_HALF * 2, height: CURSOR_HALF * 2 }}
          >
            {/* Outer ring */}
            <motion.div
              className="absolute rounded-full border-2"
              style={{
                width:       CURSOR_HALF * 2,
                height:      CURSOR_HALF * 2,
                borderColor: scrollDir !== "none" ? "#818cf8" : "var(--color-primary)",
              }}
              animate={{ opacity: blinkFlash ? 1 : 0.35, scale: blinkFlash ? 1.7 : 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            />
            {/* Center dot */}
            <motion.div
              className="rounded-full"
              style={{
                width:           12,
                height:          12,
                backgroundColor: scrollDir !== "none" ? "#818cf8" : "var(--color-primary)",
                boxShadow:       "0 0 14px var(--color-primary)",
              }}
              animate={{ scale: blinkFlash ? 2.2 : 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            />
            {/* Scroll direction arrow above cursor */}
            <AnimatePresence>
              {scrollDir !== "none" && (
                <motion.div
                  key={scrollDir}
                  initial={{ opacity: 0, y: scrollDir === "up" ? 4 : -4 }}
                  animate={{ opacity: 1, y: scrollDir === "up" ? -6 : 6 }}
                  exit={{ opacity: 0 }}
                  className="absolute text-primary"
                  style={{ [scrollDir === "up" ? "bottom" : "top"]: "100%" }}
                >
                  {scrollDir === "up"
                    ? <ArrowUp size={14} strokeWidth={3} />
                    : <ArrowDown size={14} strokeWidth={3} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Auto-calibration overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isCalibrating && isTracking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm
                       flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface border border-border p-8 rounded-3xl shadow-2xl
                         max-w-sm text-center flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 size={32} className="text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Kalibrasi Posisi</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pandang <b>lurus ke kamera</b> dan<br />
                  tahan posisi kepala selama <b>~1.5 detik</b>.<br />
                  <span className="text-xs text-amber-600 dark:text-amber-400 mt-2 block">
                    Posisi ini akan menjadi titik tengah kursor.
                  </span>
                </p>
              </div>
              <div className={`flex items-center gap-2 text-xs font-semibold ${
                isFaceDetected ? "text-green-500" : "text-amber-500"
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  isFaceDetected ? "bg-green-500" : "bg-amber-500"
                }`} />
                {isFaceDetected
                  ? "Wajah terdeteksi — sampling posisi..."
                  : "Arahkan wajah ke kamera"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Widget ────────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="fixed z-[9990]"
        style={{
          left:       position?.x ?? 0,
          top:        position?.y ?? 0,
          opacity:    position ? 1 : 0,
          transition: isDragging ? "none" : "opacity 0.3s ease",
        }}
      >
        <div className="flex flex-col items-end gap-3">

          {/* Feedback toast */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="bg-surface border border-border rounded-xl px-4 py-3 shadow-xl
                           max-w-[280px] pointer-events-auto backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-primary">
                  {feedbackIcon}
                  <p className="text-sm font-semibold leading-snug">{feedback}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden
                          w-[110px] md:w-[260px] backdrop-blur-xl transition-all duration-300">

            {/* Header / drag handle */}
            <div
              {...dragHandleProps}
              className="flex items-center justify-between px-4 py-3 bg-muted/20 select-none"
            >
              <div className="items-center gap-2.5 flex-1 min-w-0 hidden md:flex">
                <GripVertical size={12} className="text-muted shrink-0 opacity-50" />
                {!isReady ? (
                  <Loader2 size={14} className="text-primary animate-spin shrink-0" />
                ) : isCalibrating ? (
                  <Loader2 size={14} className="text-amber-500 animate-spin shrink-0" />
                ) : isTracking && isFaceDetected ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                ) : isTracking ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
                )}
                <span className="text-xs font-semibold text-foreground truncate">
                  {statusLabel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEnabled((v) => !v)}
                  disabled={!isReady}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                    cursor-pointer border-none outline-none focus:ring-2 focus:ring-primary/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${enabled
                      ? "bg-primary text-[color:var(--color-bg)] shadow-lg shadow-primary/30"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                  title={enabled ? "Matikan Tracker" : "Aktifkan Tracker"}
                >
                  {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="w-8 h-8 rounded-full bg-muted/20 text-muted-foreground hover:bg-muted/40
                             hover:text-foreground flex items-center justify-center cursor-pointer
                             border-none outline-none transition-colors"
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
                  <div className="px-4 py-4 flex flex-col gap-3">

                    {/* Calibrating banner */}
                    {isCalibrating && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3
                                      text-xs text-center text-amber-600 dark:text-amber-400 font-semibold">
                        Kalibrasi otomatis...<br />
                        <span className="font-normal">Pandang lurus ke kamera ~1.5 detik</span>
                      </div>
                    )}

                    {/* No face warning */}
                    <AnimatePresence>
                      {isTracking && !isFaceDetected && !isCalibrating && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                            <AlertCircle size={12} />
                            Wajah tidak terdeteksi
                          </div>
                          <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                            <li>• Pastikan wajah terlihat di kamera</li>
                            <li>• Perbaiki pencahayaan ruangan</li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Instructions */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-2">
                      <div className="font-bold text-foreground text-[11px] uppercase tracking-wide text-center">
                        Cara Pakai
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Move size={13} className="text-primary shrink-0" />
                        <span><b>Gerakkan kepala</b> untuk arahkan kursor</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye size={13} className="text-primary shrink-0" />
                        <span><b>Kedipkan mata</b> untuk klik</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ArrowUp   size={12} className="text-primary shrink-0" />
                        <ArrowDown size={12} className="text-primary shrink-0 -ml-1.5" />
                        <span><b>Arahkan ke tepi atas/bawah</b> untuk scroll</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 border-t border-border pt-1.5 text-center">
                        Kedip cepat (150–800ms) = klik. Tepi layar 16% = scroll otomatis.
                      </div>
                    </div>

                    {/* Camera hint */}
                    {enabled && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
                        <Video size={11} />
                        <span>Kamera aktif di pojok kanan bawah</span>
                      </div>
                    )}

                    {/* Debug Panel */}
                    <div className="text-[10px] border border-dashed border-border rounded-lg p-2.5
                                    font-mono space-y-1 bg-muted/10">
                      <div className="font-bold text-foreground mb-1 text-center text-[11px]">
                        Debug
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tracking</span>
                        {isTracking
                          ? <span className="flex items-center gap-0.5 text-green-500"><Check size={9} />ON</span>
                          : <span className="flex items-center gap-0.5 text-muted-foreground"><X size={9} />OFF</span>}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Kalibrasi</span>
                        {isCalibrating
                          ? <span className="text-amber-500">Proses...</span>
                          : <span className="flex items-center gap-0.5 text-green-500"><Check size={9} />Selesai</span>}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Wajah</span>
                        {isFaceDetected
                          ? <span className="flex items-center gap-0.5 text-green-500"><Check size={9} />Terdeteksi</span>
                          : <span className="flex items-center gap-0.5 text-red-400"><X size={9} />Tidak Ada</span>}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Scroll</span>
                        {scrollDir === "none"
                          ? <span className="text-muted-foreground">—</span>
                          : scrollDir === "up"
                            ? <span className="flex items-center gap-0.5 text-primary"><ArrowUp size={9} />Atas</span>
                            : <span className="flex items-center gap-0.5 text-primary"><ArrowDown size={9} />Bawah</span>}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Kursor Y</span>
                        <span className={(
                          cursorPos.y >= 0 &&
                          (cursorPos.y / (typeof window !== 'undefined' ? window.innerHeight : 800)) > (1 - SCROLL_ZONE_FRAC)
                        ) ? "text-primary font-bold" : "text-foreground"}>
                          {cursorPos.y < 0 ? "—" : `${cursorPos.y}px (${cursorPos.y > 0 ? Math.round(cursorPos.y / window.innerHeight * 100) : 0}%)`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">EAR</span>
                        <span className={
                          debugEAR >= 0 && debugEAR < 0.25
                            ? "text-red-500 font-bold"
                            : "text-green-500"
                        }>
                          {debugEAR >= 0 ? debugEAR.toFixed(3) : "—"}
                          {debugEAR >= 0 ? (debugEAR < 0.25 ? " KEDIP" : " buka") : ""}
                        </span>
                      </div>
                    </div>

                    {/* Recalibrate button */}
                    <button
                      onClick={recalibrate}
                      disabled={!isTracking || isCalibrating}
                      className="w-full flex items-center justify-center gap-2 bg-primary/10
                                 text-primary hover:bg-primary/20 text-xs font-semibold py-2.5
                                 px-4 rounded-lg transition-colors border-none cursor-pointer
                                 outline-none focus:ring-2 focus:ring-primary/50
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} />
                      Kalibrasi Ulang Posisi Tengah
                    </button>
                  </div>

                  {error && (
                    <div className="mx-4 mb-4 text-xs font-medium text-destructive
                                    bg-destructive/10 rounded-lg p-2.5 leading-relaxed">
                      {error}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
