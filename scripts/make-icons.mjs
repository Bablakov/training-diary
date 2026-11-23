// Рисует иконки приложения из SVG: `npm run icons`.
// Синий фон «шариковой ручки», белый гриф с блинами и кружок веса, как в тетради.
// Maskable режется по центральному кругу, поэтому содержимое уменьшается (inset < 1).
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const svg = (inset) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f45b5"/>
  <g transform="translate(256 256) scale(${inset}) translate(-256 -256)" fill="#fff">
    <rect x="96" y="244" width="320" height="24" rx="12"/>
    <rect x="128" y="176" width="40" height="160" rx="14"/>
    <rect x="344" y="176" width="40" height="160" rx="14"/>
    <rect x="84" y="206" width="32" height="100" rx="12"/>
    <rect x="396" y="206" width="32" height="100" rx="12"/>
    <circle cx="256" cy="256" r="58" fill="none" stroke="#fff" stroke-width="18"/>
  </g>
</svg>`;

const out = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(out, { recursive: true });
const jobs = [
  ["icon-512.png", 512, 1],
  ["icon-512-maskable.png", 512, 0.72],
  ["icon-192.png", 192, 1],
  ["apple-touch-icon.png", 180, 1],
  // для Android: адаптивная иконка (передний план) и обычная
  ["android-foreground.png", 432, 0.62],
  ["android-legacy.png", 192, 0.92],
];
for (const [name, size, inset] of jobs) {
  await sharp(Buffer.from(svg(inset))).resize(size, size).png().toFile(out + name);
  console.log("ok", name);
}
