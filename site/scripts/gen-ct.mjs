import sharp from "sharp";
import path from "node:path";

const N = 80;
const W = 1280;
const H = 720;
const outDir = path.resolve(process.argv[2] || "public/frames");

for (let i = 0; i < N; i++) {
  const p = i / (N - 1);
  const explode = Math.sin(p * Math.PI);
  const topY = -explode * 140;
  const midY = -explode * 60;
  const botY = explode * 60;
  const shellY = explode * 140;
  const rot = Math.sin(p * Math.PI * 2) * 2 * explode;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0f1b3a"/>
      <stop offset="100%" stop-color="#05070f"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${Array.from({length:40}).map((_,k)=>{const x=(k*97+i*13)%W;const y=(k*53+i*7)%H;const r=0.5+(k%3)*0.6;const o=0.15+(k%5)*0.05;return `<circle cx="${x}" cy="${y}" r="${r}" fill="#3b82f6" opacity="${o}"/>`;}).join("")}
  <g transform="translate(${W/2},${H/2}) rotate(${rot})">
    <g transform="translate(0,${shellY})">
      <rect x="-170" y="90" width="340" height="34" rx="17" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <rect x="-150" y="96" width="300" height="6" rx="3" fill="url(#accent)" opacity="0.6"/>
    </g>
    <g transform="translate(0,${botY})">
      <rect x="-140" y="40" width="280" height="40" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <rect x="-130" y="48" width="260" height="24" rx="4" fill="#10b981" opacity="0.85"/>
    </g>
    <g transform="translate(0,${midY})">
      <rect x="-160" y="-10" width="320" height="46" rx="6" fill="#0b1220" stroke="#3b82f6" stroke-width="1.2"/>
      ${Array.from({length:8}).map((_,k)=>`<rect x="${-150+k*40}" y="-2" width="26" height="30" rx="3" fill="#1e3a8a" opacity="0.9"/>`).join("")}
    </g>
    <g transform="translate(0,${topY})">
      <rect x="-150" y="-90" width="300" height="74" rx="10" fill="#020617" stroke="#22d3ee" stroke-width="1.5"/>
      <rect x="-138" y="-80" width="276" height="54" rx="6" fill="#0ea5e9" opacity="0.15"/>
      <text x="0" y="-48" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#22d3ee" opacity="0.9">CERTTRACK</text>
    </g>
    <g transform="translate(0,${topY-10-explode*20})">
      <rect x="-175" y="-135" width="350" height="42" rx="21" fill="#111827" stroke="#3b82f6" stroke-width="1.5"/>
      <rect x="-60" y="-120" width="120" height="12" rx="6" fill="url(#accent)" opacity="0.9" filter="url(#glow)"/>
    </g>
  </g>
  <rect x="60" y="${H-24}" width="${(W-120)*p}" height="3" rx="1.5" fill="url(#accent)" opacity="0.8"/>
</svg>`;
  const buf = Buffer.from(svg);
  await sharp(buf).resize(W, H).jpeg({ quality: 72, mozjpeg: true }).toFile(path.join(outDir, `frame_${String(i+1).padStart(3,'0')}.jpg`));
  if (i % 20 === 0) console.log("generated", i+1, "/", N);
}
console.log("done", N);
'@ | Set-Content -Path "D:\New folder\site\scripts\gen-ct.mjs" -Encoding UTF8
node "D:\New folder\site\scripts\gen-ct.mjs" "D:\New folder\client\public\frames" 2>&1 | Select-Object -Last 5