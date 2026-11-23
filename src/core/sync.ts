/**
 * Синхронизация данных дневника с приватным репозиторием GitHub.
 *
 * Каждая запись (упражнение, зал, программа, тренировка в плане, тренировка) лежит отдельным файлом
 * `data/<коллекция>/<id>.json`. Поэтому программа, изменённая на компьютере, и тренировки, записанные на
 * телефоне, никогда не конфликтуют: это разные файлы. Если одну запись правили на двух устройствах,
 * остаётся та, у которой больше `upd` (время последней правки). Удаление — это запись с `deleted: true`,
 * чтобы оно тоже доехало до других устройств.
 *
 * Изменения находятся без журнала: у каждой локальной записи считается git-sha её текста и сравнивается
 * с sha файла в репозитории. Совпало — запись одинакова, не трогаем.
 */
import { ConflictError, commitOnce, createTextBlob, getBlobText, getHead, getTree, type RepoRef, type TreeEntry } from "./github";

export const COLS = ["exercises", "gyms", "programs", "plans", "sessions"] as const;
export type Col = (typeof COLS)[number];

export interface Rec {
  id: string;
  upd?: number;
  deleted?: boolean;
  [key: string]: unknown;
}

export type Data = Record<Col, Rec[]>;

export interface SyncResult {
  pulled: number;
  pushed: number;
}

const PATH = /^data\/([a-z]+)\/(.+)\.json$/;
export const pathOf = (col: Col, id: string) => `data/${col}/${id}.json`;

/** Текст файла записи. Ключи в том порядке, в каком они в объекте: одинаковая запись даёт одинаковый текст. */
export const serialize = (r: Rec) => JSON.stringify(r, null, 1) + "\n";

/** sha, который GitHub присвоит файлу с таким текстом: sha1("blob <байты>\0<текст>"). */
export async function blobSha(text: string): Promise<string> {
  const body = new TextEncoder().encode(text);
  const head = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(head.length + body.length);
  all.set(head);
  all.set(body, head.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", all));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

const isCol = (s: string): s is Col => (COLS as readonly string[]).includes(s);

/** Пришедшая запись заменяет локальную, только если её правили позже. */
export const remoteWins = (remote: Rec, local: Rec) => (remote.upd ?? 0) > (local.upd ?? 0);

async function once(ref: RepoRef, data: Data, progress?: (msg: string) => void): Promise<SyncResult> {
  progress?.("Смотрю, что есть на GitHub…");
  const head = await getHead(ref);
  const remote = new Map<string, string>();
  for (const e of await getTree(ref, head.tree)) if (e.type === "blob" && PATH.test(e.path)) remote.set(e.path, e.sha);

  // Локальные записи и sha их текста.
  const local = new Map<string, { col: Col; idx: number; sha: string }>();
  for (const col of COLS) {
    data[col] ??= [];
    for (let idx = 0; idx < data[col].length; idx++) {
      const r = data[col][idx];
      local.set(pathOf(col, r.id), { col, idx, sha: await blobSha(serialize(r)) });
    }
  }

  // 1. Забираем то, что на GitHub отличается от нашего.
  let pulled = 0;
  const changed = [...remote].filter(([path, sha]) => local.get(path)?.sha !== sha);
  for (let i = 0; i < changed.length; i++) {
    const [path, sha] = changed[i];
    const col = PATH.exec(path)![1];
    if (!isCol(col)) continue;
    if (changed.length > 5) progress?.(`Получаю записи: ${i + 1} из ${changed.length}`);
    let rec: Rec;
    try {
      rec = JSON.parse(await getBlobText(ref, sha)) as Rec;
    } catch {
      continue; // битый файл не должен ломать всю синхронизацию
    }
    if (!rec?.id) continue;
    const mine = local.get(path);
    if (!mine) {
      data[col].push(rec);
      local.set(path, { col, idx: data[col].length - 1, sha });
      pulled++;
    } else if (remoteWins(rec, data[col][mine.idx])) {
      data[col][mine.idx] = rec;
      mine.sha = sha;
      pulled++;
    }
  }

  // 2. Отправляем то, чего на GitHub нет или что у нас свежее.
  const entries: TreeEntry[] = [];
  const toSend = [...local].filter(([path, l]) => remote.get(path) !== l.sha);
  for (let i = 0; i < toSend.length; i++) {
    const [path, l] = toSend[i];
    if (toSend.length > 5) progress?.(`Отправляю записи: ${i + 1} из ${toSend.length}`);
    const sha = await createTextBlob(ref, serialize(data[l.col][l.idx]));
    entries.push({ path, mode: "100644", type: "blob", sha });
  }
  if (entries.length) {
    progress?.("Записываю на GitHub…");
    await commitOnce(ref, head, entries, `Дневник: ${entries.length} ${entries.length === 1 ? "запись" : "записей"}`);
  }
  return { pulled, pushed: entries.length };
}

/** Полная синхронизация: забрать чужое, отдать своё. Ветку сдвинули посередине — начинаем заново. */
export async function syncData(ref: RepoRef, data: Data, progress?: (msg: string) => void): Promise<SyncResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await once(ref, data, progress);
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 300 * attempt + Math.random() * 400));
    }
  }
}
