import type { Metadata, Viewport } from "next";
import { Outfit, Unbounded } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served by Nexus itself, so no request goes to Google.
const displayFont = Unbounded({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const textFont = Outfit({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-text" });

export const metadata: Metadata = {
  title: "Nexus",
  description: "Where can I stream this? Find where a movie is available in Sweden.",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${textFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
