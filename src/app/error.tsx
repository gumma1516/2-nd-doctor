"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary. `retry()` re-fetches and re-renders the failed
 * subtree, so a transient network failure can actually recover; `reset()` only
 * re-renders the same failed state.
 */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // TODO: report to an error-tracking service (e.g. Sentry) — never include PHI.
    console.error("Route error", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-20">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 max-w-md w-full text-center">
        <div className="flex justify-center">
          <span className="icon-tile border-red-400/25! bg-red-400/8! text-red-300!">
            <CircleAlert className="size-6" strokeWidth={1.6} aria-hidden />
          </span>
        </div>
        <h1 className="text-2xl font-medium tracking-[-.03em] mt-6">Something went wrong.</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mt-3">
          This page could not be loaded. Nothing you have already submitted is lost — try again, or
          return to your workspace.
        </p>
        {error.digest && (
          <p className="text-[11px] text-zinc-500 font-mono mt-4">Reference: {error.digest}</p>
        )}
        <div className="flex flex-col min-[380px]:flex-row gap-3 mt-8">
          <button id="error-retry-btn" type="button" onClick={() => retry()} className="primary-button flex-1">
            <RotateCcw className="size-4" aria-hidden />Try again
          </button>
          <Link href="/" className="secondary-link flex-1">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
