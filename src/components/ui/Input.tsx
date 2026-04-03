import { useId } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
  label?: string;
}

export function Input({
  className,
  error,
  hint,
  id,
  label,
  type = "text",
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      {label ? (
        <label
          className="block text-xs uppercase tracking-[0.28em] text-white/70"
          htmlFor={inputId}
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type={type}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cn(
          "glass-panel glow-ring h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 focus:border-[var(--accent3)] focus:shadow-[0_0_0_1px_rgba(6,182,212,0.35),0_0_24px_rgba(6,182,212,0.18)]",
          className
        )}
        {...props}
      />
      {hint ? (
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--accent2)]" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
