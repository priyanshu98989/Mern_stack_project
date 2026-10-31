# Aether One — Premium product site

Scroll-driven 3D-style product landing page built with Next.js (App Router), TypeScript, Tailwind CSS v4, and Framer Motion.

## Setup

```bash
cd site
npm install
```

## Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

## Replace frames

1. Put your exploded-view frames in `public/frames/` named `frame_001.jpg` ... `frame_N.jpg`.
2. Update `TOTAL_FRAMES` in `hooks/useScrollFrames.ts` to match `N`.
3. Optionally adjust `SECTION_VH` in `components/ScrollAnimation.tsx` for scroll length.

## Replace content

- Product name/tagline/colors: `app/layout.tsx`, `app/globals.css`, `components/ScrollAnimation.tsx`.
- Features/specs/testimonials/pricing/FAQ: respective files in `components/`.

## Assumptions

- Product: "Aether One" wireless headphones; dark futuristic mood; primary `#05070f`, accent `#6366f1`/`#22d3ee`.
- 80 synthetic frames generated (run `npm run generate:frames` if added) as placeholders.
- No 21st.dev MCP available; components built in-house.
- Tailwind v4 with CSS-based theme; next/font (Inter + Space Grotesk).
EOF
filePath: D:\New folder\site\README.md