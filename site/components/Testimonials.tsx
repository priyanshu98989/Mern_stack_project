const testimonials = [
  {
    quote: "The spatial audio is genuinely startling. It feels like the band is in the room.",
    name: "Maya Chen",
    role: "Audio Engineer",
  },
  {
    quote: "I forgot I was wearing them. The comfort is on another level.",
    name: "Daniel Ortiz",
    role: "Frequent Traveler",
  },
  {
    quote: "ANC that actually silences a subway. I didn't think that was possible.",
    name: "Priya Sharma",
    role: "Product Designer",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <span className="text-accent-2 text-sm font-mono">LOVED BY LISTENERS</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">
            Don&apos;t take our word for it.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <figure key={t.name} className="glass rounded-2xl p-6 flex flex-col">
              <blockquote className="text-foreground/90 leading-relaxed flex-1">
                â€œ{t.quote}â€
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2" />
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
