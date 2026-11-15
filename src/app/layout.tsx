import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The fonts come from npm packages (open font licence) and are served by Nexus itself. Nothing is
// fetched from Google, neither by visitors nor during the build, so a build never fails because
// Google Fonts can't be reached. Both are variable fonts: one file covers every weight we use.
const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2",
  weight: "200 900",
  variable: "--font-display",
});
const textFont = localFont({
  src: "../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-text",
});

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
