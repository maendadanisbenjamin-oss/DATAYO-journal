import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DATAYO-journal",
    short_name: "DATAYO",
    description: "Journal de trading DATAYO : analysez vos trades, suivez vos performances et progressez.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1520",
    theme_color: "#0b1520",
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
