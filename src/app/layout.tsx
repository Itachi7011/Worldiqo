import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Worldiqo — Live global signal monitor",
  description:
    "Worldiqo tracks global news events in real time — conflict, disaster, protest, markets, and more — visualized on a live world map.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/*
          Loaded via CDN link rather than next/font/google so this works in any
          network environment out of the box. If you'd rather self-host with
          zero layout shift, switch to next/font/google for these same three
          families — Space Grotesk, Inter, JetBrains Mono.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      {/*
        suppressHydrationWarning on body: some browser extensions (e.g.
        ColorZilla, Grammarly) inject attributes like cz-shortcut-listen
        onto <body> before React hydrates. That's an extension modifying the
        DOM, not a real server/client mismatch in this app, so silence just
        this one known-harmless case rather than the whole tree.
      */}
      <body
        className="min-h-full flex flex-col bg-bg text-fg font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
