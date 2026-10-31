import { Globe, AtSign, Code2 } from "lucide-react";

const cols = [
  {
    title: "Product",
    links: ["Features", "Specs", "Pricing", "Early Access"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    title: "Support",
    links: ["Help Center", "Warranty", "Returns", "Shipping"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display font-bold text-lg">
              Aether<span className="text-accent-2">.</span>
            </div>
            <p className="mt-3 text-muted text-sm max-w-xs">
              Sound, reimagined. Premium wireless audio, engineered for the future.
            </p>
            <div className="flex gap-3 mt-5 text-muted">
              <a href="#" aria-label="Website" className="hover:text-foreground">
                <Globe size={18} />
              </a>
              <a href="#" aria-label="Email" className="hover:text-foreground">
                <AtSign size={18} />
              </a>
              <a href="#" aria-label="Code" className="hover:text-foreground">
                <Code2 size={18} />
              </a>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold mb-4">{c.title}</h4>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted">
          <span>Â© 2026 Aether Audio, Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
