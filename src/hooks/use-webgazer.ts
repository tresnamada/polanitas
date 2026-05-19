/**
 * POLANITAS — Custom Hook: useWebGazer
 *
 * Manages WebGazer.js lifecycle:
 * - Dynamically loads WebGazer (no SSR) to avoid "window is not defined"
 * - Starts/stops gaze tracking
 * - Buffers GazePoint data for submission
 *
 * Usage:
 *   const { isReady, isTracking, startTracking, stopTracking, gazePoints } = useWebGazer();
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
  showPredictionPoints: (show: boolean) => WebGazerInstance;
  showVideoPreview: (show: boolean) => WebGazerInstance;
  showFaceOverlay: (show: boolean) => WebGazerInstance;
  showFaceFeedbackBox: (show: boolean) => WebGazerInstance;
}

declare global {
  interface Window {
    webgazer: WebGazerInstance;
  }
}

export function useWebGazer() {
  const [isReady, setIsReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gazeBufferRef = useRef<GazePoint[]>([]);
  const viewportRef = useRef({ w: 0, h: 0 });

  // Load WebGazer script dynamically (browser-only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    viewportRef.current = {
      w: window.innerWidth,
      h: window.innerHeight,
    };

    if (window.webgazer) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://webgazer.cs.brown.edu/webgazer.js";
    script.async = true;
    script.onload = () => setIsReady(true);
    script.onerror = () =>
      setError("Failed to load WebGazer. Check network connection.");
    document.head.appendChild(script);

    return () => {
      // Only remove if we added it
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const startTracking = useCallback(async (
    targetElementId?: string, 
    showPoints = false, 
    onGaze?: (x: number, y: number) => void,
    onBlink?: () => void
  ) => {
    if (!isReady || !window.webgazer) {
      setError("WebGazer is not ready yet.");
      return;
    }

    gazeBufferRef.current = [];
    setIsTracking(true);
    setError(null);

    try {
      let lastValidTime = Date.now();
      let isBlinking = false;

      await window.webgazer
        .setGazeListener((data, _elapsed) => {
          const now = Date.now();
          
          if (!data) {
            // Mata hilang/tertutup
            if (!isBlinking && (now - lastValidTime) < 1000) {
              isBlinking = true;
            }
            return;
          }

          // Mata terdeteksi lagi
          if (isBlinking) {
            const blinkDuration = now - lastValidTime;
            // Blink disengaja biasanya sedikit lebih lama dari blink biasa (sekitar 300ms - 1500ms)
            if (blinkDuration >= 150 && blinkDuration <= 1500) {
              if (onBlink) onBlink();
            }
            isBlinking = false;
          }
          lastValidTime = now;

          const x = Math.round(data.x);
          const y = Math.round(data.y);
          gazeBufferRef.current.push({
            x,
            y,
            timestamp: now,
            elementId: targetElementId,
            viewport: viewportRef.current,
          });
          if (onGaze) {
            onGaze(x, y);
          }
        })
        .begin();

      // Configure WebGazer UI elements
      window.webgazer
        .showPredictionPoints(showPoints)
        .showVideoPreview(false)
        .showFaceOverlay(false)
        .showFaceFeedbackBox(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to start WebGazer.");
      setIsTracking(false);
    }
  }, [isReady]);

  const stopTracking = useCallback((): GazePoint[] => {
    if (!window.webgazer) return [];
    window.webgazer.clearGazeListener();
    window.webgazer.end();
    setIsTracking(false);
    return [...gazeBufferRef.current];
  }, []);

  const getGazePoints = useCallback((): GazePoint[] => {
    return [...gazeBufferRef.current];
  }, []);

  return {
    isReady,
    isTracking,
    error,
    startTracking,
    stopTracking,
    getGazePoints,
    pointCount: gazeBufferRef.current.length,
  };
}
