import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "maroon" | "gold" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    maroon: "bg-[#8A1538]/10 text-[#8A1538] border-[#8A1538]/20",
    gold: "bg-amber-50 text-amber-800 border-amber-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-orange-50 text-orange-700 border-orange-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
