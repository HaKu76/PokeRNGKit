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
          copyFile(
            "third_party/3dsrngtool/LICENSE",
            `${outputDirectory}/legal/3DSRNGTool-LICENSE.txt`,
          ),
          copyFile(
            "third_party/3dsrngtool/UPSTREAM.md",
            `${outputDirectory}/legal/3DSRNGTool-UPSTREAM.md`,
          ),
          copyFile(
            "third_party/pokerusfinder/UPSTREAM.md",
            `${outputDirectory}/legal/Pokerus-Finder-UPSTREAM.md`,
          ),
          copyFile(
            "third_party/pokerusfinder/LICENSE",
            `${outputDirectory}/legal/Pokerus-Finder-LICENSE.txt`,
          ),
        ]);
      },
    },
    ...(mode === "ui"
      ? []
      : [
          VitePWA({
            injectRegister: false,
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico"],
            manifest: {
              name: "PokeRNGKit",
              short_name: "PokeRNGKit",
              description: "Local-first Generation III RNG workstation.",
              theme_color: "#111619",
              background_color: "#111619",
              display: "standalone",
              icons: [
                {
                  src: "favicon.ico",
                  sizes: "32x32",
                  type: "image/x-icon",
                  purpose: "any",
                },
              ],
            },
            workbox: {
              importScripts: ["sw-update.js"],
              navigateFallback: "index.html",
              globPatterns: ["**/*.{js,css,html,ico,mjs,wasm,txt,md,png,jpg}"],
              maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
            },
          }),
        ]),
  ],
  build: {
    outDir: outputDirectory,
  },
}));
