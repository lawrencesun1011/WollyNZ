// 静态导出前置脚本：把 data/ 下的前端 JSON 生成到 public/api/，
// 替代原来由 Node 服务端提供的 /api/schools-all、/api/ece-all。
//
// 新加坡环境不支持云托管，站点改为静态托管（output: "export"），
// 运行时没有 Node 进程，因此这两个「读本地文件」的接口直接变成构建期产物。
//
// 输出体与原接口保持一致，前端 store 无需改解析逻辑：
//   public/api/schools-all.json  -> SchoolFrontend[]（裸数组）
//   public/api/ece-all.json      -> { schools: SchoolFrontend[] }

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const OUT_DIR = join(ROOT, "public", "api");

async function readJson(file) {
  const raw = await readFile(join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const schools = await readJson("schools-frontend.json");
  const ece = await readJson("ece-frontend.json");

  await writeFile(join(OUT_DIR, "schools-all.json"), JSON.stringify(schools));
  await writeFile(join(OUT_DIR, "ece-all.json"), JSON.stringify({ schools: ece }));

  console.log(
    `[prepare-static-data] 已生成：中小学 ${schools.length} 条、幼儿园 ${ece.length} 条 -> public/api/`
  );
}

main().catch((e) => {
  console.error("[prepare-static-data] 生成失败:", e);
  process.exit(1);
});
