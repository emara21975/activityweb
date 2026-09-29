"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Button } from "./button";

interface PrintButtonProps {
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PrintButton({
  label = "طباعة (HTML / PDF)",
  variant = "outline",
  size = "sm",
  className = "",
}: PrintButtonProps) {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      variant={variant}
      size={size}
      className={`print:hidden gap-1.5 font-bold ${className}`}
      title="طباعة الصفحة أو حفظها كملف PDF"
    >
      <Printer className="w-4 h-4" />
      <span>{label}</span>
    </Button>
  );
}
