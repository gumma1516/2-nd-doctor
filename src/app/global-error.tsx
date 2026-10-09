"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort boundary for failures in the root layout itself. It replaces the
 * root layout while active, so it supplies its own <html> and <body>, and keeps
 * to plain inline styles in case the stylesheet is part of what failed.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // TODO: report to an error-tracking service (e.g. Sentry) — never include PHI.
    console.error("Application error", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="en-IN">
      <body style={{ background: "#080c12", color: "#f2f6f8", margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500, letterSpacing: "-0.03em", margin: 0 }}>
            SecondCare is temporarily unavailable
          </h1>
          <p style={{ color: "#93a4b3", fontSize: "0.875rem", lineHeight: 1.7, marginTop: "0.75rem" }}>
            The application could not start. Please try again in a moment. If this continues, contact
            support with the reference below.
          </p>
          {error.digest && (
            <p style={{ color: "#80919f", fontSize: "0.6875rem", fontFamily: "monospace", marginTop: "1rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: "2rem", minHeight: 48, padding: "0.8rem 1.35rem", borderRadius: 14, border: "1px solid #adf6e3", background: "linear-gradient(145deg, #b4f7e5, #71ead2 55%, #55d7c0)", color: "#082c27", fontSize: "0.875rem", fontWeight: 650, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
