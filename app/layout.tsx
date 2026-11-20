import type { Metadata, Viewport } from "next";
import "../src/styles.css";
import "../src/reference-layout.css";
import "../src/liquid-glass-theme.css";
import "./globals.css";
import "./movibox-reference.css";
import "./movibox-app-rebuild.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://zxh-official-movies-hub.vercel.app"),
  title: {
    default: "ZXH OFFICIAL MOVIES HUB",
    template: "%s | ZXH OFFICIAL",
  },
  description: "Discover movies, series, live television and entertainment with ZXH OFFICIAL.",
  applicationName: "ZXH OFFICIAL MOVIES HUB",
  manifest: "/manifest.json",
  icons: { icon: ["/favicon.svg", "/favicon.jpg"], apple: "/favicon.jpg" },
  keywords: ["ZXH OFFICIAL", "movies", "series", "TV", "entertainment"],
  authors: [{ name: "ZULQARNAIN X HAIDER" }],
  creator: "ZULQARNAIN X HAIDER",
  openGraph: {
    type: "website",
    title: "ZXH OFFICIAL MOVIES HUB",
    description: "Movies, series and entertainment discovery.",
    siteName: "ZXH OFFICIAL",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZXH OFFICIAL MOVIES HUB",
    description: "Movies, series and entertainment discovery.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08090c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
