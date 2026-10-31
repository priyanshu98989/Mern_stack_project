"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const links = [
  { label: "Features", href: "#features" },
  { label: "Specs", href: "#specs" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <nav className="glass rounded-2xl px-5 py-3 flex items-center justify-between" aria-label="Primary">
          <a href="#" className="font-display font-bold text-lg tracking-tight">
            Aether<span className="text-accent-2">.</span>
          </a>
          <ul className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Button variant="primary" className="h-9 px-5 text-xs">
              Buy Now
            </Button>
          </div>
          <button
            className="md:hidden p-2 -mr-2"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden mt-2 glass rounded-2xl p-4"
            >
              <ul className="flex flex-col gap-3">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-2 text-sm text-muted hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Button variant="primary" className="w-full h-10">
                    Buy Now
                  </Button>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
