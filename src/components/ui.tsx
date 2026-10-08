"use client";

import { forwardRef } from "react";
import { CircleCheck, CircleAlert, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Accent = "brand" | "teal";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  accent?: Accent;
  variant?: "primary" | "secondary";
  loading?: boolean;
};

export function Button({ accent = "brand", variant = "primary", loading, disabled, className, children, ...props }: ButtonProps) {
  return <button
    {...props}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    data-accent={accent}
    className={cn("w-full disabled:opacity-50 disabled:cursor-not-allowed", variant === "primary" ? "primary-button" : "secondary-button", className)}
  >
    {loading && <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />}
    {children}
  </button>;
}

export function Field({ id, label, error, hint, children, className }: {
  id: string; label: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return <div className={className}>
    <label htmlFor={id} className="block text-sm font-medium text-zinc-200 mb-2">{label}</label>
    {children}
    {hint && !error && <p id={id + "-hint"} className="mt-2 text-xs leading-relaxed text-zinc-400">{hint}</p>}
    {error && <p id={id + "-error"} role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}

const controlBase = "form-control block w-full px-4 py-3 text-base sm:text-sm";
type ControlExtras = { accent?: Accent; invalid?: boolean };
function description(id: string | undefined, invalid: boolean | undefined, existing: string | undefined) {
  return [existing, invalid && id ? id + "-error" : undefined].filter(Boolean).join(" ") || undefined;
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & ControlExtras>(
  function Input({ accent = "brand", invalid, className, id, "aria-describedby": describedBy, ...props }, ref) {
    return <input {...props} ref={ref} id={id} data-accent={accent} aria-invalid={invalid || undefined}
      aria-describedby={description(id, invalid, describedBy)}
      className={cn(controlBase, invalid && "border-red-400/60!", className)} />;
  }
);
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & ControlExtras>(
  function Textarea({ accent = "brand", invalid, className, id, "aria-describedby": describedBy, ...props }, ref) {
    return <textarea {...props} ref={ref} id={id} data-accent={accent} aria-invalid={invalid || undefined}
      aria-describedby={description(id, invalid, describedBy)}
      className={cn(controlBase, "leading-relaxed resize-y", invalid && "border-red-400/60!", className)} />;
  }
);
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & ControlExtras>(
  function Select({ accent = "brand", invalid, className, id, children, "aria-describedby": describedBy, ...props }, ref) {
    return <select {...props} ref={ref} id={id} data-accent={accent} aria-invalid={invalid || undefined}
      aria-describedby={description(id, invalid, describedBy)}
      className={cn(controlBase, "pr-10", invalid && "border-red-400/60!", className)}>{children}</select>;
  }
);

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass-panel rounded-3xl p-6 sm:p-8", className)}>{children}</div>;
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;
  return <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
    tone === "error" && "bg-red-500/10 border-red-500/25 text-red-200",
    tone === "success" && "bg-emerald-500/10 border-emerald-500/25 text-emerald-200",
    tone === "info" && "bg-brand-300/5 border-brand-300/20 text-brand-100"
  )}><Icon className="size-4 shrink-0 mt-0.5" aria-hidden /><div className="min-w-0 break-words">{children}</div></div>;
}
