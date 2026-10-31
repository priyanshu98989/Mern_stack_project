import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

const plans = [
  {
    name: "Early Access",
    price: "$299",
    note: "Reserve now, ships Q1 2027",
    features: ["Aether One headphones", "Travel case", "2-year warranty", "Priority shipping"],
    cta: "Reserve",
    highlight: true,
  },
  {
    name: "Retail",
    price: "$349",
    note: "Available at launch",
    features: ["Aether One headphones", "Travel case", "1-year warranty"],
    cta: "Notify Me",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-accent-2 text-sm font-mono">PRICING</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">
            Choose your path.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-8 border ${
                p.highlight
                  ? "border-accent/50 bg-accent/5"
                  : "border-border bg-white/[0.02]"
              }`}
            >
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                <span className="text-muted text-sm">{p.note}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-accent-2" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={p.highlight ? "primary" : "secondary"}
                className="w-full mt-8"
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
