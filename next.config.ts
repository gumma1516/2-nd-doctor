import type { NextConfig } from "next";

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
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''} https://apis.google.com https://www.googletagmanager.com https://checkout.razorpay.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Firebase / Firestore / Storage / Auth endpoints (+ websockets for dev HMR).
              "connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://*.google-analytics.com https://*.razorpay.com",
              "frame-src 'self' blob: https://*.firebaseapp.com https://*.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
