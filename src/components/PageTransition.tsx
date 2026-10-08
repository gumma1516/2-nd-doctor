"use client";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  return <motion.div key={pathname} data-page-transition className="flex-1 flex flex-col"
    initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reduced ? 0 : 0.3, ease: "easeOut" }}
  >{children}</motion.div>;
}
