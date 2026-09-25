import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Browser-side network destinations. Anything else is blocked, so an injected
// script cannot quietly ship data to an arbitrary host.
const CONNECT_SOURCES = [
  "'self'",
  "https://hcb.hackclub.com", // live donation totals
  "https://nominatim.openstreetmap.org", // water-body names for collection points
  ...(isDev ? ["ws:", "wss:"] : []),
];

const CSP = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; eval is only needed by the dev overlay.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src ${CONNECT_SOURCES.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Geolocation is allowed for this origin only: "Use my location"
            // when placing where a reading was collected.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value: CSP,
          },
          ...(isDev ? [] : [{
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          }]),
        ],
      },
    ];
  },
};

export default nextConfig;
