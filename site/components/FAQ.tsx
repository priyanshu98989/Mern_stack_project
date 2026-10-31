"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "When does Aether One ship?", a: "Early-access units ship Q1 2027. Retail availability follows shortly after." },
  { q: "Is there a warranty?", a: "2 years for early-access backers, 1 year for retail. Extended plans available." },
  { q: "Can I return it?", a: "30-day no-questions-asked returns for all orders." },
  { q: "Does it work with my device?", a: "Any Bluetooth 5.0+ device. LDAC for hi-res on supported Android phones." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 md:py-32 px-6 bg-white/[0.02]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <span className="text-accent-2 text-sm font-mono">FAQ</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">Questions, answered.</h2>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  className="w-full flex items-center justify-between py-5 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-5 text-muted text-sm leading-relaxed">{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
