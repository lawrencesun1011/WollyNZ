// CloudBase 云函数：定时拉取 data.govt.nz 并同步到 PostgreSQL。
// 由定时触发器（每日凌晨）调用，也可手动触发。
import { main } from "../../../src/scripts/fetch-data.mjs";

export async function mainHandler(event = {}, context = {}) {
  console.log("[fetch-data] 定时任务触发", JSON.stringify(event).slice(0, 200));
  try {
    await main();
    return { ok: true, message: "数据同步完成" };
  } catch (err) {
    console.error("[fetch-data] 失败:", err);
    return { ok: false, error: String(err) };
  }
}

// 兼容 SCF/云函数入口
export { mainHandler as main };
