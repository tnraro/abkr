import { Database } from "bun:sqlite";
import { join } from "node:path";

export interface Cache {
  source: string,
  target: string,
  inspection: number,
}
export type CachePk = "source";
export type CacheNotNull = CachePk | "target" | "inspection";
export type CacheHasDefault = "inspection";
export type CacheSelect = Pick<Cache, CacheNotNull> & Partial<Omit<Cache, CacheNotNull>>
type NotNullWithoutDefault = keyof Omit<{ [K in CacheNotNull]: never }, CacheHasDefault>
export type CacheInsert = Pick<Cache, NotNullWithoutDefault> & Partial<Omit<Cache, NotNullWithoutDefault>>
export type CacheUpdate = Pick<Cache, CachePk> & Partial<Omit<Cache, CachePk>>;

export function createDatabase() {
  const db = new Database(join(import.meta.dir, "../data/cache.sqlite"), { strict: true });
  init(db);

  return db;

  function init(db: Database) {
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec(`create table if not exists cache (
      source text not null primary key,
      target text not null,
      inspection integer not null default 0
    ) strict`);
  }
}