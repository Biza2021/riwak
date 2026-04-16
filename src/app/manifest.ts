import type { MetadataRoute } from "next";

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
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
