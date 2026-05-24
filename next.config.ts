import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Firebase Admin out of the client bundle
  serverExternalPackages: ["firebase-admin"],

  images: {
    remotePatterns: [
      // YouTube thumbnails
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },

  // Allow Apify and YouTube API calls from server
  experimental: {
    serverActions: {
      // Increase body size limit for gaze data payloads (default 1MB)
      bodySizeLimit: "5mb",
    },
  },

  // Required for MediaPipe WASM (used by WebGazer face detection)
  async headers() {
    return [
      {
        // Apply WASM MIME type + cross-origin headers to MediaPipe assets
        source: "/mediapipe/:path*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        // JS files under mediapipe need correct MIME type
        source: "/mediapipe/face_mesh/:file*.js",
        headers: [
          { key: "Content-Type", value: "text/javascript" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
