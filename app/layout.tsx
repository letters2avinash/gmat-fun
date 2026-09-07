import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMAT PREP — Adaptive GMAT Prep",
  description:
    "Adaptive GMAT tests, an AI tutor for every section, and everything you need for the full admissions process — built for your phone and your laptop.",
};

// Locks mobile scaling so the test UI behaves like a native app, not a
// pinch-zoomable webpage — important for the "perfect on phone" requirement.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
