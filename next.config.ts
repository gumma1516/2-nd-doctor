import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js needs inline scripts; dev mode also needs eval for HMR.
              `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://apis.google.com https://www.googletagmanager.com https://checkout.razorpay.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Firebase / Firestore / Storage / Auth endpoints (+ websockets for dev HMR).
              // The local emulators are plain http on 127.0.0.1, which the production
              // policy must never allow — without the dev entry, signing in, reading
              // Firestore and uploading all fail against `firebase emulators:start`.
              `connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://*.google-analytics.com https://*.razorpay.com${isProduction ? '' : ' http://127.0.0.1:* http://localhost:*'}`,
              "frame-src 'self' blob: https://*.firebaseapp.com https://*.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // `next dev` blocks dev-resource requests from an origin other than the one it
  // printed, which breaks HMR (and therefore hydration) when the app is opened
  // on 127.0.0.1 instead of localhost.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
