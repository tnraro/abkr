import { file, serve } from "bun";
import { join } from "node:path";
import { createDatabase, type CacheSelect, type CacheUpdate } from "./db";

using db = createDatabase();

const update = db.query<void, CacheUpdate>(`update cache set target=$target, inspection=$inspection where source=$source`)
const select = db.query<CacheSelect, { i: number }>(`select * from cache where rowid = $i`);
const selectErrorPrev = db.query<{ i: number }, { i: number }>("select max(rowid) as i from cache where (inspection=1 or inspection=2) and rowid < $i");
const selectErrorNext = db.query<{ i: number }, { i: number }>("select rowid as i from cache where (inspection=1 or inspection=2) and rowid > $i limit 1");

serve({
  async fetch(req) {
    const url = new URL(req.url)
    if (req.method === "GET" && url.pathname === "/") {
      return new Response(file(join(import.meta.dir, "inspection.html")));
    }
    if (req.method === "GET" && url.pathname === "/api/data") {
      const i = Number(url.searchParams.get("i"));
      return json(select.get({ i }));
    }
    if (req.method === "GET" && url.pathname === "/api/data/error") {
      const i = Number(url.searchParams.get("i"));
      const d = url.searchParams.get("d");
      let nextIndex;
      if (d === "prev") {
        nextIndex = selectErrorPrev.get({ i })?.i;
      } else if (d === "next") {
        nextIndex = selectErrorNext.get({ i })?.i;
      }
      return json(nextIndex ?? i);
    }
    if (req.method === "PATCH" && url.pathname === "/api/data") {
      update.run(await req.json());

      return new Response("");
    }
    return new Response("Not Found", { status: 404 })
  },
});

function json(x: unknown, status = 200) {
  return new Response(JSON.stringify(x), {
    status,
    headers: {
      "content-type": "application/json"
    }
  })
}
