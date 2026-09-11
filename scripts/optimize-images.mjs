// 构建期图片处理：
//  - 源文件（原始 png/jpg）放在 assets-src/images/，作为本地存档，不进入部署产物。
//  - 本脚本把它们转成 WebP 输出到 public/images/（静态导出会原样部署 public/）。
//  - 同时生成响应式断点：base-640w.webp / 960w / 1280w / 1600w（仅下采样，不放大）。
//  - 幂等：仅当目标缺失或源比目标更新时才重新生成。
// 断点 WIDTHS 必须与 src/components/smart-image.tsx 中的 WIDTHS 保持一致。

import { readdir, stat, mkdir } from "node:fs/promises";
import { join, extname, dirname, relative, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "assets-src", "images");
const OUT = join(ROOT, "..", "public", "images");
const RASTER = new Set([".png", ".jpg", ".jpeg"]);
const WIDTHS = [640, 960, 1280, 1600];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (RASTER.has(extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function needsBuild(src, dst) {
  try {
    const [s, d] = await Promise.all([stat(src), stat(dst)]);
    return d.mtimeMs < s.mtimeMs;
  } catch {
    return true; // 目标不存在
  }
}

async function ensureDir(p) {
  await mkdir(dirname(p), { recursive: true });
}

async function main() {
  const files = await walk(SRC);
  let generated = 0;
  let skipped = 0;

  for (const src of files) {
    const rel = relative(SRC, src);
    const sub = relative(SRC, dirname(src));
    const base = parse(src).name;
    const outBase = join(OUT, sub, base);
    const isPng = extname(src).toLowerCase() === ".png";

    const meta = await sharp(src).metadata();
    const srcW = meta.width || 0;
    const opts = isPng
      ? { quality: 92, alphaQuality: 100, effort: 5 }
      : { quality: 80, effort: 5 };

    // 全尺寸 WebP
    const fullDst = `${outBase}.webp`;
    if (await needsBuild(src, fullDst)) {
      await ensureDir(fullDst);
      await sharp(src).webp(opts).toFile(fullDst);
      generated++;
      console.log(`webp  ${rel.padEnd(42)}`);
    } else {
      skipped++;
    }

    // 响应式断点（仅对宽度足够大的图生成，避免列出不存在的尺寸）
    for (const w of WIDTHS) {
      if (w >= srcW) continue;
      const dst = `${outBase}-${w}w.webp`;
      if (!(await needsBuild(src, dst))) {
        skipped++;
        continue;
      }
      await ensureDir(dst);
      await sharp(src).resize(w).webp(opts).toFile(dst);
      generated++;
      console.log(`  -${w}w  ${rel}`);
    }
  }

  console.log(`\n完成：${generated} 个 WebP 已生成/更新，${skipped} 个已是最新。原图保留在 assets-src/（不部署）。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
