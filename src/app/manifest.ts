import type { MetadataRoute } from "next";
import { branding } from "@/lib/schema";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.appName,
    short_name: "Donna",
    description: `${branding.appName} — WhatsApp, agenda e a Pati no bolso`,
    start_url: "/atendimento",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#7a1f32",
    theme_color: "#7a1f32",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
