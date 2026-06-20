import type { Metadata } from "next";
import { Manrope, DM_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
  // never fall back to a serif during the swap window
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

// Display serif — free stand-in for 205TF "Exposure" (high-contrast,
// crisp serif). Used for emphasis pills like the "Poke" link.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memento — a local-first editor for your AI agent's memory",
  description:
    "Memento is the editor for a GitHub-backed memory repo. Markdown on disk, synced like code, quiet enough to live in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmMono.variable} ${fraunces.variable}`}>
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
