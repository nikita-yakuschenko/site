import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "public/video/framing");
const output = path.join(root, "public/video/framing-webp");
const files = (await readdir(source))
  .filter(file => /^Кадр\d+\.png$/i.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (!files.length) throw new Error("No PNG master frames found");
await mkdir(output, { recursive: true });
const frames = [];
let sourceBytes = 0;
let webpBytes = 0;
let dimensions;

for (const file of files) {
  const input = await readFile(path.join(source, file));
  const png = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const size = { width: png.info.width, height: png.info.height };
  dimensions ??= size;
  if (size.width !== dimensions.width || size.height !== dimensions.height) {
    throw new Error(`Inconsistent frame dimensions: ${file}`);
  }
  const webp = await sharp(input).webp({ lossless: true, effort: 6 }).toBuffer();
  const decoded = await sharp(webp).ensureAlpha().raw().toBuffer();
  // RGB under fully transparent pixels is immaterial; every visible pixel and alpha must match.
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] !== decoded[i + 3] || (png.data[i + 3] !== 0 && (
      png.data[i] !== decoded[i] || png.data[i + 1] !== decoded[i + 1] || png.data[i + 2] !== decoded[i + 2]
    ))) throw new Error(`Lossless pixel verification failed: ${file}`);
  }
  const name = `frame-${file.match(/\d+/)[0]}.webp`;
  const version = createHash("sha256").update(webp).digest("hex").slice(0, 12);
  await writeFile(path.join(output, name), webp);
  frames.push(`/video/framing-webp/${name}?v=${version}`);
  sourceBytes += input.length;
  webpBytes += webp.length;
  if (frames.length % 10 === 0) console.log(`Converted ${frames.length}/${files.length}`);
}

await mkdir(path.join(root, "src/data"), { recursive: true });
await writeFile(path.join(root, "src/data/manufacture-frames.json"), `${JSON.stringify({ ...dimensions, frames }, null, 2)}\n`);
console.log(`${frames.length} verified lossless frames: ${(sourceBytes / 1e6).toFixed(1)} MB PNG → ${(webpBytes / 1e6).toFixed(1)} MB WebP (${Math.round((1 - webpBytes / sourceBytes) * 100)}% smaller)`);
