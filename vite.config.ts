import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// Сайт живёт на GitHub Pages в подпапке репозитория. Сборка для Android (`--mode android`) кладёт
// файлы прямо в assets приложения: пути относительные, сервис-воркер не нужен — всё и так внутри APK.
export default defineConfig(({ mode }) => {
  const android = mode === "android";
  const base = android ? "./" : "/training-diary/";
  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __ANDROID__: JSON.stringify(android) },
    plugins: android
      ? []
      : [
          VitePWA({
            registerType: "autoUpdate",
            injectRegister: "auto",
            manifest: {
              name: "Дневник тренировок",
              short_name: "Тренировки",
              description: "Программы, план наперёд, запись в зале и статистика — работает без сети",
              lang: "ru",
              start_url: base,
              scope: base,
              display: "standalone",
              orientation: "portrait",
              background_color: "#0f1626",
              theme_color: "#0f1626",
              icons: [
                { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
                { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
              navigateFallback: `${base}index.html`,
              // Шрифты кладём в кэш при первом показе: все наборы символов сразу — лишние мегабайты.
              runtimeCaching: [
                {
                  urlPattern: ({ request }) => request.destination === "font",
                  handler: "CacheFirst",
                  options: { cacheName: "fonts", expiration: { maxEntries: 60 } },
                },
              ],
            },
          }),
        ],
    build: { target: "es2022", sourcemap: false, outDir: android ? "android/app/src/main/assets/www" : "dist", emptyOutDir: true },
    test: { include: ["src/**/*.test.ts"] },
  };
});
