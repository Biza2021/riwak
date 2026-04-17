import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "riwak",
    template: "%s | riwak",
  },
  description:
    "Commande rapide et fidélité pour coffee shop, pensée pour les téléphones.",
  manifest: "/manifest.webmanifest",
  applicationName: "riwak",
  appleWebApp: {
    capable: true,
    title: "riwak",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8c6239",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
