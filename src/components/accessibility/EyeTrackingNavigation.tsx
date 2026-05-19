"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAccessibility } from "@/hooks/use-accessibility";
import { useWebGazer } from "@/hooks/use-webgazer";
import { Eye, EyeOff, Target, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Dwell configuration ────────────────────────────────────────────────────────
const DWELL_RADIUS = 50;
const DWELL_TIME_MS = 1500;

export function EyeTrackingNavigation() {
  const { user } = useAuth();
  const { prefs } = useAccessibility(user?.uid);
  const hasHandDisability = prefs?.hasHandDisability ?? false;

  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Dwell & Position state
  const [dwellProgress, setDwellProgress] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const latestCursorPos = useRef({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState<string | null>(null);

  const dwellCenter = useRef<{ x: number; y: number } | null>(null);
  const dwellStartTime = useRef<number>(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFeedback(msg: string) {
    setFeedback(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
  }

  // ── Gaze Handler (Dwell Click Logic) ─────────────────────────────────────────
  const handleGaze = useCallback((x: number, y: number) => {
    latestCursorPos.current = { x, y };
    setCursorPos({ x, y });

    const now = Date.now();
    if (!dwellCenter.current) {
      dwellCenter.current = { x, y };
      dwellStartTime.current = now;
      setDwellProgress(0);
      return;
    }

    const dist = Math.hypot(x - dwellCenter.current.x, y - dwellCenter.current.y);
    if (dist > DWELL_RADIUS) {
      // Reset dwell
      dwellCenter.current = { x, y };
      dwellStartTime.current = now;
      setDwellProgress(0);
    } else {
      // Increment dwell
      const elapsed = now - dwellStartTime.current;
      const progress = Math.min(100, (elapsed / DWELL_TIME_MS) * 100);
      setDwellProgress(progress);

      if (progress >= 100) {
        // Trigger click!
        const el = document.elementFromPoint(x, y);
        if (el && el.tagName !== "BODY" && el.tagName !== "HTML") {
          // Highlight element briefly
          const htmlEl = el as HTMLElement;
          const oldOutline = htmlEl.style.outline;
          htmlEl.style.outline = "3px solid var(--color-primary)";
          setTimeout(() => {
            htmlEl.style.outline = oldOutline;
          }, 300);

          htmlEl.click();
          showFeedback("🖱️ Dwell Click");
        }
        
        // Reset after click to prevent multi-clicking
        dwellCenter.current = null;
        setDwellProgress(0);
      }
    }
  }, []);

  // ── Blink Handler (Blink to Click) ───────────────────────────────────────────
  const handleBlink = useCallback(() => {
    const { x, y } = latestCursorPos.current;
    
    const el = document.elementFromPoint(x, y);
    if (el && el.tagName !== "BODY" && el.tagName !== "HTML") {
      const htmlEl = el as HTMLElement;
      const oldOutline = htmlEl.style.outline;
      htmlEl.style.outline = "3px solid var(--color-primary)";
      setTimeout(() => {
        htmlEl.style.outline = oldOutline;
      }, 300);

      htmlEl.click();
      showFeedback("👁️ Blink Click");
    }
    
    // Reset dwell progress as click has happened
    dwellCenter.current = null;
    setDwellProgress(0);
  }, []);

  const { isReady, isTracking, error, startTracking, stopTracking } = useWebGazer();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (enabled && isReady && !isTracking) {
      // Start with prediction points ON for navigation, pass both gaze and blink handlers
      startTracking(undefined, true, handleGaze, handleBlink);
    } else if (!enabled && isTracking) {
      stopTracking();
      setDwellProgress(0);
    }
  }, [enabled, isReady, isTracking, startTracking, stopTracking, handleGaze]);

  if (!mounted) return null;
  if (!hasHandDisability) return null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Calibration Overlay */}
      <AnimatePresence>
        {isCalibrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-surface/90 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="bg-surface border border-border p-8 rounded-3xl shadow-2xl max-w-lg text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Target size={32} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Kalibrasi Eye Tracking</h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Untuk hasil terbaik, minta bantuan pendamping untuk mengklik 9 titik merah yang muncul di layar, sambil Anda <b>terus menatap titik tersebut</b> saat diklik.
              </p>
              <button 
                onClick={() => setIsCalibrating(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all border-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-surface"
              >
                Selesai Kalibrasi
              </button>
            </div>

            {/* 9 Calibration Dots */}
            {[
              { top: "5%", left: "5%" }, { top: "5%", left: "50%" }, { top: "5%", left: "95%" },
              { top: "50%", left: "5%" }, { top: "50%", left: "50%" }, { top: "50%", left: "95%" },
              { top: "95%", left: "5%" }, { top: "95%", left: "50%" }, { top: "95%", left: "95%" },
            ].map((pos, i) => (
              <button
                key={i}
                className="absolute w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 cursor-crosshair hover:bg-red-600 transition-colors"
                style={{ top: pos.top, left: pos.left }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.backgroundColor = "var(--color-done)";
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Gaze Cursor with Dwell Indicator */}
      {enabled && isTracking && (
        <div 
          className="fixed z-[9998] pointer-events-none transition-transform duration-75 ease-linear"
          style={{ 
            left: cursorPos.x, 
            top: cursorPos.y,
            transform: "translate(-50%, -50%)"
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* The cursor dot */}
            <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_var(--color-primary)]" />
            
            {/* Dwell progress ring */}
            {dwellProgress > 0 && (
              <svg className="absolute w-12 h-12 -rotate-90 opacity-80" viewBox="0 0 36 36">
                <path
                  className="text-border"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-primary transition-all duration-75 ease-linear"
                  strokeDasharray={`${dwellProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Widget UI */}
      <div className="flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="bg-surface border border-border rounded-xl px-4 py-3 shadow-xl max-w-[280px] pointer-events-auto backdrop-blur-xl bg-opacity-95"
            >
              <p className="text-sm font-semibold text-primary leading-snug">{feedback}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden w-[100px] md:w-[260px] pointer-events-auto backdrop-blur-xl bg-opacity-95 transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-2.5 flex-1 min-w-0 hidden md:block">
              {!isReady ? (
                <Loader2 size={14} className="text-primary animate-spin shrink-0" />
              ) : isTracking ? (
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
              )}
              <span className="text-xs font-semibold text-foreground truncate">
                {!isReady ? "Memuat Tracker..." : isTracking ? "Merekam Mata" : "Tracker Nonaktif"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle */}
              <button
                onClick={() => setEnabled(!enabled)}
                disabled={!isReady}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border-none outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed
                  ${enabled ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                title={enabled ? "Matikan Tracker" : "Aktifkan Tracker"}
              >
                {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {/* Collapse */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-8 h-8 rounded-full bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center justify-center cursor-pointer border-none outline-none transition-colors"
              >
                {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Expandable Body */}
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
                  <p className="text-xs text-muted-foreground leading-relaxed text-start md:text-center">
                    Tatap sebuah area selama <b>1.5 detik</b>, atau <b>kedipkan mata</b> untuk klik otomatis.
                  </p>
                  <button
                    onClick={() => setIsCalibrating(true)}
                    className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors border-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <Target size={14} /> Kalibrasi
                  </button>
                </div>
                {error && (
                  <div className="mx-4 mb-4 text-xs font-medium text-destructive bg-destructive/10 rounded-lg p-2.5 leading-relaxed">
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
