import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary:
      "bg-[#8A1538] text-white hover:bg-[#70112d] shadow-sm hover:shadow focus-visible:ring-[#8A1538]",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-300",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300",
    ghost:
      "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-200",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
    gold:
      "bg-[#C59B27] text-white hover:bg-[#A8831E] shadow-sm hover:shadow focus-visible:ring-[#C59B27]",
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
