"use client";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div data-reveal className={cn(className)}
    initial={reduced ? false : { opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
  >{children}</motion.div>;
}
