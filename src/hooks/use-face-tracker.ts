/**
 * POLANITAS — Custom Hook: useFaceTracker
 *
 * Uses MediaPipe FaceMesh (local wasm from /mediapipe/face_mesh/) to:
 * - Track head/nose position → cursor movement (no eye/pupil dependency)
 * - Detect blinks via Eye Aspect Ratio (EAR) → trigger onBlink()
 * - Auto-calibrate center position from first ~1.5s of detection
 *
 * Replaces WebGazer for face-direction-based cursor control.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── MediaPipe FaceMesh type declarations ──────────────────────────────────────
interface Landmark { x: number; y: number; z: number; }
interface FaceMeshResults { multiFaceLandmarks?: Landmark[][]; }
interface FaceMeshOptions {
  maxNumFaces?: number;
  refineLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}
interface FaceMeshInstance {
  setOptions(o: FaceMeshOptions): Promise<void>;
  onResults(cb: (r: FaceMeshResults) => void): void;
  send(i: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}
declare global {
  interface Window {
    FaceMesh: new (cfg: { locateFile(f: string): string }) => FaceMeshInstance;
  }
}

// ── Landmark indices (MediaPipe FaceMesh 468-point model) ─────────────────────
// Nose tip — used for head position tracking
const NOSE_TIP = 1;

// Eye contour indices for Eye Aspect Ratio (EAR) blink detection
// Format: [outer, top-outer, top-inner, inner, bot-inner, bot-outer]
const L_EYE = [33,  160, 158, 133, 153, 144] as const;
const R_EYE = [362, 385, 387, 263, 373, 380] as const;

// ── Tunable constants ─────────────────────────────────────────────────────────
const EMA_ALPHA      = 0.10;  // Smoothing factor (lower = smoother, slower response)
const SENSITIVITY    = 4.0;   // Head movement amplification to screen space
// EAR threshold: 0.25 is standard for 4:3 video with aspect-ratio-corrected distances.
// Open eye ≈ 0.35–0.45, closed eye ≈ 0.10–0.20. Threshold at 0.25 gives safe margin.
const EAR_THRESH     = 0.25;
// BLINK_MIN=1: allows detecting a quick blink even at low MediaPipe framerates (~15fps)
const BLINK_MIN      = 1;
const BLINK_MAX      = 30;    // Max frames closed (>30 = deliberate close, not blink)
const CALIB_FRAMES   = 45;    // Frames to sample for auto-center calibration (~1.5s)

// Correct for non-square pixel aspect in normalized coords.
// MediaPipe x ∈ [0,1] spans 640px; y ∈ [0,1] spans 480px.
// Without correction, horizontal distances are underestimated → EAR too high.
const VIDEO_ASPECT = 640 / 480; // 1.333…

/**
 * Compute Eye Aspect Ratio (EAR) from 6 landmark indices.
 * Corrects for video aspect ratio so that EAR matches physical eye geometry.
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
function ear(lm: Landmark[], idx: readonly number[]): number {
  const d = (a: number, b: number) =>
    Math.hypot(
      (lm[a].x - lm[b].x) * VIDEO_ASPECT, // correct horizontal scale
      (lm[a].y - lm[b].y),
    );
  return (d(idx[1], idx[5]) + d(idx[2], idx[4])) / (2 * d(idx[0], idx[3]));
}

export function useFaceTracker(
  onGaze?: (x: number, y: number) => void,
  onBlink?: () => void,
) {
  const [isReady,        setIsReady]        = useState(false);
  const [isTracking,     setIsTracking]     = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isCalibrating,  setIsCalibrating]  = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  // Live EAR value for debug panel — updated every frame
  const [debugEAR,       setDebugEAR]       = useState<number>(-1);

  // Internal refs — never cause re-renders
  const fmRef        = useRef<FaceMeshInstance | null>(null);
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number>(0);
  const processingRef = useRef(false);
  const runningRef   = useRef(false);

  // Live-swappable callbacks via refs
  const onGazeRef  = useRef(onGaze);
  const onBlinkRef = useRef(onBlink);
  useEffect(() => { onGazeRef.current  = onGaze;  }, [onGaze]);
  useEffect(() => { onBlinkRef.current = onBlink; }, [onBlink]);

  // EMA smoother state
  const smX = useRef(-1);
  const smY = useRef(-1);

  // Auto-calibration: sample nose position for CALIB_FRAMES, then set center
  const ctrX         = useRef(0.5);
  const ctrY         = useRef(0.5);
  const calibSamples = useRef<{ x: number; y: number }[]>([]);
  const calibDone    = useRef(false);

  // Blink detection state
  const blinkCnt  = useRef(0);
  const faceDetRef = useRef(false);

  // ── Load MediaPipe FaceMesh from CDN (wasm served locally) ───────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.FaceMesh) { setIsReady(true); return; }

    const s = document.createElement("script");
    s.src         = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js";
    s.crossOrigin = "anonymous";
    s.async       = true;
    s.onload      = () => setIsReady(true);
    s.onerror     = () => setError("Gagal memuat FaceMesh. Periksa koneksi internet.");
    document.head.appendChild(s);
    return () => { document.head.contains(s) && document.head.removeChild(s); };
  }, []);

  // ── Per-frame result processor ────────────────────────────────────────────
  const handleResults = useCallback((r: FaceMeshResults) => {
    // No face found
    if (!r.multiFaceLandmarks?.length) {
      if (faceDetRef.current) {
        faceDetRef.current = false;
        setIsFaceDetected(false);
      }
      blinkCnt.current = 0;
      return;
    }

    // Face acquired
    if (!faceDetRef.current) {
      faceDetRef.current = true;
      setIsFaceDetected(true);
    }

    const lm   = r.multiFaceLandmarks[0];
    const nose = lm[NOSE_TIP];

    // Flip X: in camera frame, user-right = lower x.
    // We flip so turning head right moves cursor right.
    const rawX = 1 - nose.x;
    const rawY = nose.y;

    // ── Auto-calibrate center from first CALIB_FRAMES samples ──────────────
    if (!calibDone.current) {
      calibSamples.current.push({ x: rawX, y: rawY });
      if (calibSamples.current.length >= CALIB_FRAMES) {
        const n  = calibSamples.current.length;
        ctrX.current = calibSamples.current.reduce((s, p) => s + p.x, 0) / n;
        ctrY.current = calibSamples.current.reduce((s, p) => s + p.y, 0) / n;
        calibDone.current    = true;
        calibSamples.current = [];
        smX.current = -1; // reset smoother so it warm-starts from calibrated position
        smY.current = -1;
        setIsCalibrating(false);
      }
      return; // Don't emit cursor position during calibration
    }

    // ── Blink detection via EAR ───────────────────────────────────────────
    const earL   = ear(lm, L_EYE);
    const earR   = ear(lm, R_EYE);
    const avgEAR = (earL + earR) / 2;

    // Expose live EAR for debug panel (throttle to avoid excessive re-renders)
    setDebugEAR(Math.round(avgEAR * 1000) / 1000);

    if (avgEAR < EAR_THRESH) {
      blinkCnt.current++;
      // Log when eye closes (helps diagnose threshold issues)
      if (blinkCnt.current === 1) {
        console.log(`[FaceTracker] Blink start: EAR=${avgEAR.toFixed(3)} (threshold=${EAR_THRESH})`);
      }
    } else {
      const c = blinkCnt.current;
      if (c >= BLINK_MIN && c <= BLINK_MAX) {
        console.log(`[FaceTracker] ✅ Blink detected! frames=${c}, EAR=${avgEAR.toFixed(3)}`);
        onBlinkRef.current?.();
      } else if (c > 0) {
        console.log(`[FaceTracker] ❌ Blink ignored: frames=${c} (min=${BLINK_MIN}, max=${BLINK_MAX})`);
      }
      blinkCnt.current = 0;
    }

    // ── Map nose position to screen coordinates ──────────────────────────
    // Center the movement around the calibrated home position,
    // then amplify by SENSITIVITY to cover the full screen.
    const sx = Math.max(0, Math.min(window.innerWidth,
      (0.5 + (rawX - ctrX.current) * SENSITIVITY) * window.innerWidth));
    const sy = Math.max(0, Math.min(window.innerHeight,
      (0.5 + (rawY - ctrY.current) * SENSITIVITY) * window.innerHeight));

    // EMA smoothing: reduces jitter while preserving natural movement
    smX.current = smX.current < 0 ? sx : smX.current + EMA_ALPHA * (sx - smX.current);
    smY.current = smY.current < 0 ? sy : smY.current + EMA_ALPHA * (sy - smY.current);

    onGazeRef.current?.(Math.round(smX.current), Math.round(smY.current));
  }, []);

  // ── RAF animation loop ────────────────────────────────────────────────────
  const loop = useCallback(() => {
    if (!runningRef.current) return;

    // Throttle: only call send() when FaceMesh is not already processing
    const vid = videoRef.current;
    if (!processingRef.current && fmRef.current && vid && vid.readyState >= 2) {
      processingRef.current = true;
      fmRef.current
        .send({ image: vid })
        .catch(() => {})
        .finally(() => { processingRef.current = false; });
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Start tracking ────────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {
    if (!isReady) { setError("FaceMesh belum siap."); return; }
    if (runningRef.current) { setIsTracking(true); return; }

    setError(null);
    setIsFaceDetected(false);
    setIsCalibrating(true);
    faceDetRef.current    = false;
    smX.current           = -1;
    smY.current           = -1;
    blinkCnt.current      = 0;
    calibDone.current     = false;
    calibSamples.current  = [];
    processingRef.current = false;

    try {
      // Request camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      // Hidden video for MediaPipe processing
      const procVid         = document.createElement("video");
      procVid.id            = "ftProcessVideo";
      procVid.autoplay      = true;
      procVid.playsInline   = true;
      procVid.muted         = true;
      procVid.srcObject     = stream;
      procVid.style.display = "none";
      document.body.appendChild(procVid);
      videoRef.current = procVid;

      // Visible preview video (CSS-positioned by EyeTrackingNavigation)
      const prevVid       = document.createElement("video");
      prevVid.id          = "ftPreviewVideo";
      prevVid.autoplay    = true;
      prevVid.playsInline = true;
      prevVid.muted       = true;
      prevVid.srcObject   = stream;
      document.body.appendChild(prevVid);

      // Wait for video to have first frame
      await new Promise<void>((res) => { procVid.onloadeddata = () => res(); });

      // Create FaceMesh — use local wasm files via locateFile
      const fm = new window.FaceMesh({
        locateFile: (f: string) => `/mediapipe/face_mesh/${f}`,
      });
      await fm.setOptions({
        maxNumFaces:            1,
        // refineLandmarks: true gives more precise eye contour landmarks → better EAR
        refineLandmarks:        true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
      });
      fm.onResults(handleResults);
      fmRef.current = fm;

      runningRef.current = true;
      setIsTracking(true);
      rafRef.current = requestAnimationFrame(loop);

    } catch (err: unknown) {
      let msg = "Gagal memulai kamera.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") msg = "Akses kamera ditolak. Izinkan kamera di browser.";
        else if (err.name === "NotFoundError") msg = "Kamera tidak ditemukan.";
        else msg = err.message;
      }
      setError(msg);
      setIsTracking(false);
      setIsCalibrating(false);
    }
  }, [isReady, handleResults, loop]);

  // ── Stop tracking ─────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    try { fmRef.current?.close(); } catch (_) { /* ignore */ }
    fmRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    videoRef.current?.remove();
    videoRef.current = null;
    document.getElementById("ftPreviewVideo")?.remove();
    faceDetRef.current    = false;
    processingRef.current = false;
    setIsTracking(false);
    setIsCalibrating(false);
    setIsFaceDetected(false);
  }, []);

  // ── Re-calibrate center (call when user wants to reset home position) ─────
  const recalibrate = useCallback(() => {
    if (!runningRef.current) return;
    calibDone.current    = false;
    calibSamples.current = [];
    smX.current          = -1;
    smY.current          = -1;
    setIsCalibrating(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { stopTracking(); }, [stopTracking]);

  return {
    isReady,
    isTracking,
    isFaceDetected,
    isCalibrating,
    error,
    debugEAR,
    startTracking,
    stopTracking,
    recalibrate,
  };
}
