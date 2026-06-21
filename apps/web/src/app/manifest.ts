import type { MetadataRoute } from "next";

// PWA-манифест: делает сайт устанавливаемым (иконка, полноэкранный режим).
// Из него же генерируется Android-приложение (TWA через PWABuilder/Bubblewrap).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IBILIM",
    short_name: "IBILIM",
    description:
      "IBILIM — onlayn darslar platformasi. Repetitorlar va mutaxassislar bilan video-darslar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    lang: "uz",
    dir: "ltr",
    categories: ["education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
