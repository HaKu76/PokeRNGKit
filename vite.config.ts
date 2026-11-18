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
          copyFile(
            "node_modules/@noble/ciphers/LICENSE",
            `${outputDirectory}/legal/Noble-Ciphers-LICENSE.txt`,
          ),
          copyFile(
            "node_modules/@noble/hashes/LICENSE",
            `${outputDirectory}/legal/Noble-Hashes-LICENSE.txt`,
          ),
          copyFile(
            "third_party/pkhex/dotnet-notices/LICENSE.txt",
            `${outputDirectory}/legal/DotNet-LICENSE.txt`,
          ),
          copyFile(
            "third_party/pkhex/dotnet-notices/ThirdPartyNotices.txt",
            `${outputDirectory}/legal/DotNet-ThirdPartyNotices.txt`,
          ),
          copyFile(
            "third_party/pkhex/LICENSE",
            `${outputDirectory}/legal/PKHeX-LICENSE.txt`,
          ),
          copyFile(
            "third_party/pkhex/UPSTREAM.md",
            `${outputDirectory}/legal/PKHeX-UPSTREAM.md`,
          ),
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
            registerType: "prompt",
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
              skipWaiting: false,
              clientsClaim: true,
              navigateFallback: "index.html",
              globPatterns: ["**/*.{js,css,html,ico,mjs,wasm,txt,md,png,jpg}"],
              globIgnores: ["save-info/**"],
              maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
              runtimeCaching: [
                {
                  urlPattern: ({ url, sameOrigin }) =>
                    sameOrigin &&
                    url.pathname.endsWith("/save-info/_framework/dotnet.js"),
                  handler: "NetworkFirst",
                  options: {
                    cacheName: "pokerngkit-save-info-launcher-v1",
                    networkTimeoutSeconds: 3,
                    cacheableResponse: { statuses: [200] },
                  },
                },
                {
                  urlPattern: ({ url, sameOrigin }) =>
                    sameOrigin &&
                    /\/save-info\/_framework\/[^/]+\.(?:js|wasm|dat|dll|json)$/.test(
                      url.pathname,
                    ),
                  handler: "CacheFirst",
                  options: {
                    cacheName: "pokerngkit-save-info-assets-v1",
                    cacheableResponse: { statuses: [200] },
                    expiration: { maxEntries: 128 },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  server: {
    watch: {
      ignored: [
        "**/third_party/pkhex/**/bin/**",
        "**/third_party/pkhex/**/obj/**",
        "**/wasm/modules/saveinfo/**/bin/**",
        "**/wasm/modules/saveinfo/**/obj/**",
        "**/.tools/**",
        "**/.tmp/**",
      ],
    },
  },
  build: {
    outDir: outputDirectory,
  },
}));
