/**
 * Downloads one optimized local flag per ISO country code.
 * New tennis players only need a stored country-code mapping; their flag is then already local.
 */
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flagsRoot = resolve(repoRoot, "apps/web/public/sports-logos/flags");
const codesResponse = await fetch("https://flagcdn.com/en/codes.json", {
  headers: { accept: "application/json" }
});

if (!codesResponse.ok) {
  throw new Error(`Flag code download failed with status ${codesResponse.status}.`);
}

const codeRows = await codesResponse.json();
const countryCodes = Object.keys(codeRows)
  .map((code) => code.trim().toLowerCase())
  .filter((code) => /^[a-z]{2}$/.test(code))
  .sort();

await mkdir(flagsRoot, { recursive: true });
await runWithConcurrency(countryCodes, 10, async (countryCode) => {
  const response = await fetch(`https://flagcdn.com/w80/${countryCode}.png`);
  if (!response.ok) {
    throw new Error(`Flag download failed for ${countryCode} with status ${response.status}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer)
    .resize({ width: 80, height: 60, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 92 })
    .toFile(resolve(flagsRoot, `${countryCode}.webp`));
});

console.log(`Stored ${countryCodes.length} tennis country flags locally.`);

async function runWithConcurrency(items, concurrency, task) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await task(item);
    }
  });
  await Promise.all(workers);
}
