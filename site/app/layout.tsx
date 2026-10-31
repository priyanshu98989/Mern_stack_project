import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aether One â€” Sound, reimagined.",
  description:
    "Aether One is a premium wireless audio device with spatial sound, adaptive noise cancellation, and 48-hour battery.",
  metadataBase: new URL("https://aether-one.example.com"),
  openGraph: {
    title: "Aether One â€” Sound, reimagined.",
    description:
      "Premium wireless audio with spatial sound and adaptive noise cancellation.",
    type: "website",
    images: [{ url: "/frames/frame_001.jpg", width: 1280, height: 720 }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
