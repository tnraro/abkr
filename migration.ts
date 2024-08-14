import { Database } from "bun:sqlite";
import { join } from "node:path";

using db = new Database(join(import.meta.dir, "data/cache.sqlite"), { strict: true });
