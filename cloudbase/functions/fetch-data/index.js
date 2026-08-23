// CloudBase 云函数（诊断版）：探测云端对 data.govt.nz 各端点的可达性。
const RES = "bf9e3389-d5f5-4889-8be9-43d07cc98254";

async function probe(name, url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (NZ-schools-sync)" },
      redirect: "follow",
    });
    const text = await res.text();
    return { name, status: res.status, len: text.length, head: text.slice(0, 80).replace(/\n/g, " ") };
  } catch (e) {
    return { name, error: String(e).slice(0, 120) };
  }
}

exports.main = async function (event = {}, context = {}) {
  const results = await Promise.all([
    probe("datastore_search", `https://catalogue.data.govt.nz/api/3/action/datastore_search?resource_id=${RES}&limit=1`),
    probe("datastore_dump", `https://catalogue.data.govt.nz/datastore/dump/${RES}`),
    probe("dataset_page", `https://catalogue.data.govt.nz/dataset/schools-registers-and-update-information`),
  ]);
  return { ok: true, results };
};
