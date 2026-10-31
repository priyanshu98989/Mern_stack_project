const specs = [
  { label: "Driver", value: "40mm beryllium dynamic" },
  { label: "Frequency response", value: "4 Hz â€“ 40 kHz" },
  { label: "Battery life", value: "48 hours (ANC on)" },
  { label: "Charge time", value: "10 min = 5 hours" },
  { label: "Weight", value: "268 g" },
  { label: "Connectivity", value: "Bluetooth 5.4, LDAC, AAC, SBC" },
  { label: "Water resistance", value: "IPX5" },
  { label: "Microphones", value: "8-mic array with AI beamforming" },
];

export default function Specs() {
  return (
    <section id="specs" className="py-24 md:py-32 px-6 bg-white/[0.02]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <span className="text-accent-2 text-sm font-mono">SPECIFICATIONS</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">Built to a higher standard.</h2>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {specs.map((s, i) => (
                <tr key={s.label} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                  <th
                    scope="row"
                    className="text-left font-medium text-foreground px-6 py-4 w-1/2"
                  >
                    {s.label}
                  </th>
                  <td className="text-muted px-6 py-4">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
