import { Database } from "bun:sqlite";
import { join } from "node:path";

using db = new Database(join(import.meta.dir, "data/cache.sqlite"), { strict: true });

type CacheUpdate = {
  source: string;
  target: string;
  inspection: number;
}
type CacheSelect = {
  source: string;
  target: string;
  inspection: number
}
using update = db.query<void, CacheUpdate>(`update cache set target=$target, inspection=$inspection where source=$source`)
using selectAll = db.query<CacheSelect, []>("select * from cache");

run([
  (x) => {
    if (!/\bAbe\b/.test(x.source)) return
    if (x.target.includes("에이브") && !x.target.includes("아베")) return

    return "abe";
  },
  (x) => {
    if (/\(\s*\[\d+(?:\.\d+)?\]|\[\d+(?:\.\d+)?\]\s*\)/.test(x.target)) return "wrong-ts";
  },
  (x) => {
    const a = [...x.source.matchAll(/(?<=\[)\d+(?:\.\d+)?(?=\])/g)].map(x => x[0])
    const b = [...x.target.matchAll(/(?<=\[)\d+(?:\.\d+)?(?=\])/g)].map(x => x[0])
    if (a.length === 0 && b.length === 0) return;
    if (a.length !== b.length) return "ts-mismatch";
    if (a.some((a, i) => a !== b[i])) return "ts-mismatch";
  },
  (x) => {
    const a = new Set([...x.source.matchAll(/\{\w+\}/g)].map(x => x[0]))
    const b = new Set([...x.source.matchAll(/\{\w+\}/g)].map(x => x[0]))
    if (a.size === 0 && b.size === 0) return;
    if (a.size !== b.size) return "st-mismatch";
    if (a.isSupersetOf(b) && b.isSupersetOf(a)) return;
    return "st-mismatch"
  }
])

function run(plugins: ((x: CacheSelect) => string | void)[]) {
  const result = [];
  for (const x of selectAll.all()) {
    const errors = [];
    for (const plugin of plugins) {
      const res = plugin(x);
      if (res != null) errors.push(res)
    }
    if (errors.length > 0) {
      result.push({
        ...x,
        errors,
      });
      update.run({
        ...x,
        inspection: 1,
      })
    }
  }
  console.log(result, result.length)
  return result;
}