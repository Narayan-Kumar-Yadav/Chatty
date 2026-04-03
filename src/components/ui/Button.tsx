import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "ghost" | "primary" | "secondary";
type ButtonSize = "lg" | "md" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-white/10 bg-gradient-to-r from-[var(--accent)] via-[var(--accent2)] to-[var(--accent3)] text-white shadow-[0_14px_40px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(124,58,237,0.45)]",
  secondary:
    "glass-panel text-white hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)]",
  ghost:
    "border border-transparent bg-white/0 text-white/80 hover:border-white/10 hover:bg-white/5 hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-xs uppercase tracking-[0.24em]",
  md: "h-12 px-5 text-sm uppercase tracking-[0.24em]",
  lg: "h-14 px-6 text-sm uppercase tracking-[0.28em]",
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  icon,
  loading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon ? (
        <span className="flex items-center justify-center">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
