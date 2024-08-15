import { env, file, write } from "bun";
import { Translator } from "deepl-node";
import { join } from "node:path";
import { parse, unparse } from "papaparse";
import { createDatabase, type CacheInsert, type CacheSelect } from "./db";

using db = createDatabase();

const insert = db.query<void, CacheInsert>(`insert into cache (source, target) values ($source, $target)`)
const select = db.query<Pick<CacheSelect, "target">, { source: string }>(`select target from cache where source = $source`);

const { Locres, UnrealPak, AbPath, OutPath, DEEPL_KEY } = env;

assert(DEEPL_KEY)
assert(Locres)
assert(UnrealPak)
assert(AbPath)
assert(OutPath)

const t = new Translator(DEEPL_KEY);

const LangPak = join(AbPath, "\\AbioticFactor\\Content\\Paks\\pakchunk0-Windows.pak")
const LocresPath = join(OutPath, "\\AbioticFactor\\Content\\Localization\\Game\\en\\Game.locres")
const CsvPath = join(OutPath, "\\AbioticFactor\\Content\\Localization\\Game\\en\\Game.csv")
console.log(CsvPath)

const data = await unpack();

db.close();

async function pack() {
  // await $`${Locres} export Game.new -o result.csv`;
  // await $`${Locres} import ${LocresPath} "Game.csv" -o Game.new`;
}

async function unpack() {
  // await $`rm -rf ${OutPath}`;

  // await $`${UnrealPak} ${LangPak} -Extract ${OutPath}`;

  // await $`${Locres} export ${LocresPath} -o ${CsvPath}`;

  const data = await csv(CsvPath);

  const res: Row[] = [];

  let requestedCharacters = 0;
  for (const { key, source } of data) {
    const cache = select.get({ source });
    if (cache != null) {
      console.log("[cached]", source)
      res.push({
        key,
        source: cache.target,
        target: "",
      });
    } else {
      if (/[a-zA-Z]/.test(source)) {
        console.log("[reques]", source)
        requestedCharacters += xml(source).length;
        const target = await translate(source);
        insert.run({
          source,
          target,
        });
      } else {
        console.log("[no eng]", source)
        insert.run({
          source,
          target: source,
        });
      }
    }
  }
  console.log("total requested characters", requestedCharacters);

  return {
    data,
    res,
  }
}

async function translate(source: string) {
  const res = await t.translateText(xml(source), "en", "ko", { tagHandling: "xml", ignoreTags: "x" });
  return unxml(res.text);
}
function xml(x: string) {
  return x.replaceAll(/\{\w+\}|\[\d+(?:\.\d+)?\]/g, "<x>$&</x>")
}
function unxml(x: string) {
  return x.replaceAll(/<x>([^<]+)<\/x>/g, "$1")
}


interface Row { key: string, source: string, target: string }
async function csv(path: string) {
  const str = await file(path).text()

  const { data } = parse<Row>(str.trim(), {
    delimiter: ",",
    header: true,
  })
  return data
}

async function toCsv(path: string, rows: Row[]) {
  await write(path, unparse(rows) + "\r\n");
}

function distinct<T>(arr: T[]): T[] {
  return [...new Set<T>(arr)]
}

function assert<T>(x: T | undefined | null, message?: string): asserts x is T {
  if (x == null) throw new Error(message);
}