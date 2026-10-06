"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // TODO: report to an error-tracking service (e.g. Sentry) — never include PHI.
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-zinc-400">An unexpected error occurred. Please try again.</p>
        {error.digest && <p className="mt-2 text-xs text-zinc-600 font-mono">Ref: {error.digest}</p>}
        <button
          id="error-retry-btn"
          onClick={reset}
          className="mt-8 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-full font-semibold transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
