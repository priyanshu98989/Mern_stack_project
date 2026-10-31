import { Zap, Headphones, Battery, Shield, Wifi, Sparkles } from "lucide-react";

const features = [
  { icon: Headphones, title: "Spatial Audio", desc: "3D soundstage that tracks your head position in real time." },
  { icon: Zap, title: "Adaptive ANC", desc: "Cancels noise 200Ã— per second for a silent, focused world." },
  { icon: Battery, title: "48h Battery", desc: "A week of listening on a single charge. Fast-charge in 10 min." },
  { icon: Shield, title: "Titanium Frame", desc: "Aerospace-grade build that survives daily life." },
  { icon: Wifi, title: "Bluetooth 5.4", desc: "LDAC hi-res wireless with ultra-low latency." },
  { icon: Sparkles, title: "Comfort Fit", desc: "Memory-foam cushions shaped to your ears." },
];

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <span className="text-accent-2 text-sm font-mono">FEATURES</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 leading-tight">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="mt-4 text-muted text-lg">
            Engineered for the way you actually listen â€” on the move, at work, and at rest.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group glass rounded-2xl p-6 hover:border-accent/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/15 text-accent-2 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <f.icon size={20} />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
