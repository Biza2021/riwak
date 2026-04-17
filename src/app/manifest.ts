import type { MetadataRoute } from "next";

const APP_ICON_VERSION = "2026-04-17-appicon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "riwak",
    short_name: "riwak",
    description:
      "Commande rapide et fidélité pour coffee shop, pensée pour le téléphone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f0e6",
    theme_color: "#8c6239",
    icons: [
      {
        src: `/pwa/riwak-192.png?v=${APP_ICON_VERSION}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/pwa/riwak-512.png?v=${APP_ICON_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/pwa/riwak-512.png?v=${APP_ICON_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
