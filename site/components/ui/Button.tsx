"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

export function Button({ variant = "primary", className, children, ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-accent text-white hover:bg-accent/90",
    secondary: "bg-white/5 text-foreground hover:bg-white/10 border border-border",
    ghost: "text-muted hover:text-foreground",
  }[variant];
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(base, styles, className)}
      {...(rest as unknown as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}
