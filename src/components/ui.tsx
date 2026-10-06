import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Accent = "brand" | "teal";

/* ---------- Button ---------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  accent?: Accent;
  variant?: "primary" | "secondary";
  loading?: boolean;
};

export function Button({
  accent = "brand",
  variant = "primary",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        variant === "primary" &&
          accent === "brand" &&
          "bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.35)] focus-visible:ring-brand-500",
        variant === "primary" &&
          accent === "teal" &&
          "bg-teal-600 hover:bg-teal-500 text-white border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)] hover:shadow-[0_0_25px_rgba(20,184,166,0.35)] focus-visible:ring-teal-500",
        variant === "secondary" &&
          "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 focus-visible:ring-zinc-500",
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : children}
    </button>
  );
}

/* ---------- Field (label + control + error) ---------- */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Input / Textarea / Select ---------- */
const controlBase =
  "block w-full px-4 py-3 bg-zinc-950 border text-white rounded-xl placeholder-zinc-600 transition-colors focus:outline-none focus:ring-2";

const accentRing: Record<Accent, string> = {
  brand: "focus:ring-brand-500/40 focus:border-brand-500",
  teal: "focus:ring-teal-500/40 focus:border-teal-500",
};

type ControlExtras = { accent?: Accent; invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & ControlExtras>(
  function Input({ accent = "brand", invalid, className, id, ...props }, ref) {
    return (
      <input
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(controlBase, accentRing[accent], invalid ? "border-red-500/60" : "border-zinc-800", className)}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & ControlExtras
>(function Textarea({ accent = "brand", invalid, className, id, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cn(controlBase, accentRing[accent], invalid ? "border-red-500/60" : "border-zinc-800", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & ControlExtras>(
  function Select({ accent = "brand", invalid, className, id, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(controlBase, accentRing[accent], invalid ? "border-red-500/60" : "border-zinc-800", className)}
        {...props}
      >
        {children}
      </select>
    );
  }
);

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-800", className)}>{children}</div>
  );
}

/* ---------- Alert ---------- */
export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error" && "bg-red-500/10 border-red-500/30 text-red-300",
        tone === "success" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        tone === "info" && "bg-brand-500/10 border-brand-500/30 text-brand-200"
      )}
    >
      {children}
    </div>
  );
}
