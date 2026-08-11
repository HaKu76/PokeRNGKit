import { copyFile, mkdir } from "node:fs/promises";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const outputDirectory = "dist";

export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    react(),
    {
      name: "pokerngkit-legal-files",
      apply: "build",
      async closeBundle() {
        await mkdir(`${outputDirectory}/legal`, { recursive: true });
        await Promise.all([
          copyFile("LICENSE", `${outputDirectory}/legal/LICENSE.txt`),
          copyFile(
            "third_party/pokefinder/UPSTREAM.md",
            `${outputDirectory}/legal/UPSTREAM.md`,
          ),
        ]);
      },
    },
    ...(mode === "ui"
      ? []
      : [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icon.svg"],
            manifest: {
              name: "PokeRNGKit",
              short_name: "PokeRNGKit",
              description: "Local-first Generation III RNG workstation.",
              theme_color: "#111619",
              background_color: "#111619",
              display: "standalone",
              icons: [
                {
                  src: "icon.svg",
                  sizes: "any",
                  type: "image/svg+xml",
                  purpose: "any maskable",
                },
              ],
            },
            workbox: {
              navigateFallback: "index.html",
              globPatterns: ["**/*.{js,css,html,svg,mjs,wasm,txt,md}"],
            },
          }),
        ]),
  ],
  build: {
    outDir: outputDirectory,
  },
}));
