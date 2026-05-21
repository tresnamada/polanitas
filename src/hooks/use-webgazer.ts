/**
 * POLANITAS — Custom Hook: useWebGazer
 *
 * Manages WebGazer.js lifecycle:
 * - Dynamically loads WebGazer (no SSR)
 * - Starts/stops gaze tracking
 * - Buffers GazePoint data
 * - Live gaze listener swap (no restart needed)
 * - Tracks face detection status (decoupled from gaze nullability)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GazePoint } from "@/types";

interface WebGazerInstance {
  begin: () => Promise<WebGazerInstance>;
  end: () => void;
  setGazeListener: (
    listener: (data: { x: number; y: number } | null, elapsedTime: number) => void
  ) => WebGazerInstance;
  clearGazeListener: () => WebGazerInstance;
  showPredictionPoints?: (show: boolean) => unknown;
  showVideoPreview?: (show: boolean) => unknown;
  showFaceOverlay?: (show: boolean) => unknown;
  showFaceFeedbackBox?: (show: boolean) => unknown;
  removeMouseEventListeners?: () => WebGazerInstance;
  addMouseEventListeners?: () => WebGazerInstance;
  saveDataAcrossSessions?: (save: boolean) => WebGazerInstance;
  clearData?: () => WebGazerInstance;
  recordScreenPosition?: (x: number, y: number, eventType: string) => WebGazerInstance;
  getTracker?: () => { predictionReady: boolean } | null;
}

declare global {
  interface Window {
    webgazer: WebGazerInstance;
  }
}

/** Safely call an optional WebGazer method — no chaining, no crash */
function wgCall(fn: ((arg: boolean) => unknown) | undefined, arg: boolean) {
  if (typeof fn === "function") {
    try { fn(arg); } catch (_) { /* ignore */ }
  }
}

// EMA smoothing factor: 0 = no movement, 1 = no smoothing
const SMOOTHING = 0.25;

export function useWebGazer() {
  const [isReady,        setIsReady]        = useState(false);
  const [isTracking,     setIsTracking]     = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const gazeBufferRef      = useRef<GazePoint[]>([]);
  const viewportRef        = useRef({ w: 0, h: 0 });
  const isStartedRef       = useRef(false);
  const faceDetectedRef    = useRef(false);

  // Live-swappable handlers
  const onGazeRef          = useRef<((x: number, y: number) => void) | undefined>(undefined);
  const onBlinkRef         = useRef<(() => void) | undefined>(undefined);
  const targetElementIdRef = useRef<string | undefined>(undefined);

  // ── Load WebGazer script (browser-only) ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    viewportRef.current = { w: window.innerWidth, h: window.innerHeight };

    if (window.webgazer) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src   = "https://webgazer.cs.brown.edu/webgazer.js";
    script.async = true;
    script.onload  = () => setIsReady(true);
    script.onerror = () => setError("Gagal memuat WebGazer. Periksa koneksi internet.");
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  // ── Swap handlers without restarting WebGazer ────────────────────────────────
  const updateGazeListener = useCallback((
    onGaze?: (x: number, y: number) => void,
    onBlink?: () => void,
    targetElementId?: string,
  ) => {
    onGazeRef.current          = onGaze;
    onBlinkRef.current         = onBlink;
    targetElementIdRef.current = targetElementId;
  }, []);

  // ── Clear Calibration Data ───────────────────────────────────────────────────
  const clearData = useCallback(() => {
    if (window.webgazer && typeof window.webgazer.clearData === "function") {
      try { window.webgazer.clearData(); } catch (_) { /* ignore */ }
    }
  }, []);

  const removeMouseEventListeners = useCallback(() => {
    if (window.webgazer && typeof window.webgazer.removeMouseEventListeners === "function") {
      try { window.webgazer.removeMouseEventListeners(); } catch (_) { /* ignore */ }
    }
  }, []);

  const addMouseEventListeners = useCallback(() => {
    if (window.webgazer && typeof window.webgazer.addMouseEventListeners === "function") {
      try { window.webgazer.addMouseEventListeners(); } catch (_) { /* ignore */ }
    }
  }, []);

  // ── Start tracking ────────────────────────────────────────────────────────────
  const startTracking = useCallback(async (
    targetElementId?: string,
    showPoints = false,
    onGaze?: (x: number, y: number) => void,
    onBlink?: () => void,
    keepMouseListeners = false,
  ) => {
    if (!isReady || !window.webgazer) {
      setError("WebGazer belum siap.");
      return;
    }

    onGazeRef.current          = onGaze;
    onBlinkRef.current         = onBlink;
    targetElementIdRef.current = targetElementId;

    // Prevent double-start
    if (isStartedRef.current) {
      setIsTracking(true);
      return;
    }

    gazeBufferRef.current = [];
    setError(null);
    setIsFaceDetected(false);
    faceDetectedRef.current = false;

    try {
      // EMA smoothing state — lives inside the listener closure
      let smoothX = -1;
      let smoothY = -1;

      // Blink detection state
      // lastGazeTime tracks the last time we got a valid non-null gaze
      let lastGazeTime    = 0;
      let isBlinkPending  = false;

      // Master gaze listener — delegates to swappable ref handlers
      window.webgazer.setGazeListener((data, _elapsed) => {
        const now = Date.now();

        // ── Face detection: use tracker.predictionReady as ground truth ──────
        // This is INDEPENDENT of whether `data` is null.
        // data can be null even when face IS detected (e.g., model not calibrated yet).
        const tracker    = typeof window.webgazer.getTracker === "function"
          ? window.webgazer.getTracker()
          : null;
        const faceIsHere = tracker ? tracker.predictionReady : (data !== null);

        if (faceIsHere !== faceDetectedRef.current) {
          faceDetectedRef.current = faceIsHere;
          setIsFaceDetected(faceIsHere);
        }

        // ── Null / invalid data: face briefly lost or model not ready ────────
        if (!data || isNaN(data.x) || isNaN(data.y) || !isFinite(data.x) || !isFinite(data.y)) {
          // Start a potential blink if we recently had valid gaze (< 800ms ago)
          if (lastGazeTime > 0 && (now - lastGazeTime) < 800 && !isBlinkPending) {
            isBlinkPending = true;
          }
          return;
        }

        // ── Valid gaze data arrived ──────────────────────────────────────────

        // Resolve blink: gaze was absent 150–1500ms → blink
        if (isBlinkPending) {
          const gap = now - lastGazeTime;
          if (gap >= 150 && gap <= 1500) {
            if (onBlinkRef.current) onBlinkRef.current();
          }
          isBlinkPending = false;
        }
        lastGazeTime = now;

        // Apply EMA smoothing (warm-start on first point)
        if (smoothX < 0) {
          smoothX = data.x;
          smoothY = data.y;
        } else {
          smoothX = smoothX + SMOOTHING * (data.x - smoothX);
          smoothY = smoothY + SMOOTHING * (data.y - smoothY);
        }

        const x = Math.round(smoothX);
        const y = Math.round(smoothY);

        gazeBufferRef.current.push({
          x, y,
          timestamp:  now,
          elementId:  targetElementIdRef.current,
          viewport:   viewportRef.current,
        });

        if (onGazeRef.current) onGazeRef.current(x, y);
      });

      await window.webgazer.begin();

      isStartedRef.current = true;
      setIsTracking(true);

      const wg = window.webgazer;

      // Mouse listeners: keep active during calibration, remove after
      if (keepMouseListeners) {
        try { wg.addMouseEventListeners?.(); } catch (_) { /* ignore */ }
      } else {
        try { wg.removeMouseEventListeners?.(); } catch (_) { /* ignore */ }
      }

      // Disable cross-session localforage to keep memory footprint low
      try { wg.saveDataAcrossSessions?.(false); } catch (_) { /* ignore */ }

      // Configure WebGazer UI — call each method INDIVIDUALLY
      wgCall(wg.showPredictionPoints?.bind(wg), showPoints);
      // ⚠️ Do NOT call showVideoPreview(false) — sets inline display:none our CSS can't override
      wgCall(wg.showFaceOverlay?.bind(wg),       true);
      wgCall(wg.showFaceFeedbackBox?.bind(wg),   false);

    } catch (err: unknown) {
      let msg = "Gagal memulai WebGazer.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.message.includes("Permission")) {
          msg = "Akses kamera ditolak. Izinkan kamera di pengaturan browser.";
        } else if (err.name === "NotFoundError") {
          msg = "Kamera tidak ditemukan. Pastikan kamera terhubung.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
      setIsTracking(false);
      isStartedRef.current = false;
    }
  }, [isReady]);

  // ── Stop tracking ─────────────────────────────────────────────────────────────
  const stopTracking = useCallback((): GazePoint[] => {
    if (!window.webgazer) return [];
    try { window.webgazer.clearGazeListener(); }       catch (_) { /* ignore */ }
    try { window.webgazer.removeMouseEventListeners?.(); } catch (_) { /* ignore */ }
    try { window.webgazer.end(); }                     catch (_) { /* ignore */ }
    isStartedRef.current    = false;
    faceDetectedRef.current = false;
    setIsTracking(false);
    setIsFaceDetected(false);
    return [...gazeBufferRef.current];
  }, []);

  const getGazePoints = useCallback((): GazePoint[] => {
    return [...gazeBufferRef.current];
  }, []);

  return {
    isReady,
    isTracking,
    isFaceDetected,
    error,
    startTracking,
    stopTracking,
    updateGazeListener,
    getGazePoints,
    clearData,
    addMouseEventListeners,
    removeMouseEventListeners,
    pointCount: gazeBufferRef.current.length,
  };
}
