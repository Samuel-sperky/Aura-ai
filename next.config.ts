import type { NextConfig } from "next";
// Relative import (not the `@/` alias): next.config.ts is compiled by Next's own
// loader where the tsconfig path alias is not guaranteed to resolve. The file is
// still type-checked by `tsc --noEmit` because it lives under the project root.
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Self-contained build output for the Docker deploy: `next build` emits a
  // minimal server at `.next/standalone` runnable via `node server.js`.
  output: "standalone",

  // Do not advertise the framework via the `X-Powered-By` response header.
  poweredByHeader: false,

  // DEV-ONLY: allow the dev server to serve internal/dev assets to requests
  // arriving through an ngrok tunnel. Ignored entirely in production.
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
  ],

  // Apply the security headers (CSP, HSTS, nosniff, frame/referrer/permissions
  // policy) to EVERY route. Defined once in src/lib/security/headers.ts.
  //
  // CRITICAL: the CSP keeps `script-src 'self' 'unsafe-inline'` — without it the
  // Next App Router RSC payload and the pre-paint theme script are blocked and
  // the page stays a dead SSR shell.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
