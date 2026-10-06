"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after hydration on the client. No setState-in-effect needed. */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * Renders children only on the client. Use for components that read
 * browser-only storage (sessionStorage) during their initial render,
 * avoiding hydration mismatches.
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return useIsClient() ? <>{children}</> : <>{fallback}</>;
}
