import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Processo Seletivo IFMG 2027",
    short_name: "Vestibular IFMG 2027",
    description:
      "Acompanhamento de inscrições do Processo Seletivo IFMG 2027 em tempo real",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1a4a38",
    theme_color: "#1a4a38",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
