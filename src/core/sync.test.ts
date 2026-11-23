import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RepoRef } from "./github";
import { blobSha, pathOf, serialize, syncData, type Data, type Rec } from "./sync";

const ref: RepoRef = { owner: "o", repo: "r", branch: "main", token: "t" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Поддельный GitHub в памяти: blob'ы, деревья (плоские), коммиты и одна ветка. */
class FakeGithub {
  blobs = new Map<string, string>();
  trees = new Map<string, Map<string, string>>();
  commits = new Map<string, string>();
  head = "c0";
  n = 0;
  /** Сколько раз сдвинуть ветку «чужим» коммитом прямо перед нашим PATCH. */
  interfere = 0;
  constructor() {
    this.trees.set("t0", new Map());
    this.commits.set("c0", "t0");
  }
  files(): Map<string, string> {
    const t = this.trees.get(this.commits.get(this.head)!)!;
    return new Map([...t].map(([p, sha]) => [p, this.blobs.get(sha)!]));
  }
  async put(path: string, text: string) {
    const sha = await blobSha(text);
    this.blobs.set(sha, text);
    const t = new Map(this.trees.get(this.commits.get(this.head)!)!);
    t.set(path, sha);
    const tid = `t${++this.n}`, cid = `c${this.n}`;
    this.trees.set(tid, t);
    this.commits.set(cid, tid);
    this.head = cid;
  }
  install() {
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const m = init.method ?? "GET";
      const path = url.replace("https://api.github.com/repos/o/r", "");
      const body = init.body ? JSON.parse(String(init.body)) : {};
      if (m === "GET" && path.startsWith("/git/ref/heads/")) return json({ object: { sha: this.head } });
      if (m === "GET" && path.startsWith("/git/commits/")) return json({ tree: { sha: this.commits.get(path.split("/").pop()!) } });
      if (m === "GET" && path.startsWith("/git/trees/")) {
        const t = this.trees.get(path.split("/").pop()!.split("?")[0])!;
        return json({ truncated: false, tree: [...t].map(([p, sha]) => ({ path: p, type: "blob", sha })) });
      }
      if (m === "GET" && path.startsWith("/git/blobs/")) return new Response(this.blobs.get(path.split("/").pop()!)!);
      if (m === "POST" && path === "/git/blobs") {
        const sha = await blobSha(body.content);
        this.blobs.set(sha, body.content);
        return json({ sha });
      }
      if (m === "POST" && path === "/git/trees") {
        const t = new Map(this.trees.get(body.base_tree)!);
        for (const e of body.tree) t.set(e.path, e.sha);
        const id = `t${++this.n}`;
        this.trees.set(id, t);
        return json({ sha: id });
      }
      if (m === "POST" && path === "/git/commits") {
        const id = `c${++this.n}`;
        this.commits.set(id, body.tree);
        (this as unknown as { parents: Map<string, string> }).parents ??= new Map();
        (this as unknown as { parents: Map<string, string> }).parents.set(id, body.parents[0]);
        return json({ sha: id });
      }
      if (m === "PATCH") {
        if (this.interfere > 0) {
          this.interfere--;
          await this.put(pathOf("sessions", "other"), serialize({ id: "other", upd: 5, title: "с другого устройства" }));
        }
        const parent = (this as unknown as { parents: Map<string, string> }).parents.get(body.sha);
        if (parent !== this.head) return json({ message: "Update is not a fast forward" }, 422);
        this.head = body.sha;
        return json({});
      }
      throw new Error(`неожиданный запрос ${m} ${path}`);
    });
  }
}

const empty = (): Data => ({ exercises: [], gyms: [], programs: [], plans: [], sessions: [] });
const rec = (id: string, upd: number, extra: Partial<Rec> = {}): Rec => ({ id, upd, ...extra });

let gh: FakeGithub;
beforeEach(() => {
  gh = new FakeGithub();
  gh.install();
  vi.stubGlobal("setTimeout", (fn: () => void) => {
    fn();
    return 0;
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("syncData", () => {
  it("первая синхронизация отправляет все записи отдельными файлами", async () => {
    const d = empty();
    d.programs.push(rec("p1", 10, { title: "Грудь + Спина" }));
    d.sessions.push(rec("s1", 20));
    expect(await syncData(ref, d)).toEqual({ pulled: 0, pushed: 2 });
    expect([...gh.files().keys()].sort()).toEqual(["data/programs/p1.json", "data/sessions/s1.json"]);
  });

  it("повторная синхронизация без изменений ничего не гоняет", async () => {
    const d = empty();
    d.programs.push(rec("p1", 10));
    await syncData(ref, d);
    expect(await syncData(ref, d)).toEqual({ pulled: 0, pushed: 0 });
  });

  it("программа с компьютера и тренировки с телефона не мешают друг другу", async () => {
    const pc = empty(), phone = empty();
    pc.programs.push(rec("p1", 10, { title: "Старая" }));
    await syncData(ref, pc);
    await syncData(ref, phone);
    expect(phone.programs[0].title).toBe("Старая");

    // Без связи: на компьютере правят программу, на телефоне записывают две тренировки.
    pc.programs[0] = rec("p1", 30, { title: "Новая" });
    phone.sessions.push(rec("s1", 25), rec("s2", 26));

    await syncData(ref, pc); // компьютер успел первым
    const r = await syncData(ref, phone);
    expect(r).toEqual({ pulled: 1, pushed: 2 });
    expect(phone.programs[0].title).toBe("Новая");

    await syncData(ref, pc);
    expect(pc.sessions.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
  });

  it("одну запись правили на двух устройствах — остаётся более свежая правка", async () => {
    const a = empty(), b = empty();
    a.programs.push(rec("p1", 10, { title: "A0" }));
    await syncData(ref, a);
    await syncData(ref, b);
    a.programs[0] = rec("p1", 50, { title: "A — позже" });
    b.programs[0] = rec("p1", 40, { title: "B — раньше" });
    await syncData(ref, b);
    await syncData(ref, a);
    await syncData(ref, b);
    expect(a.programs[0].title).toBe("A — позже");
    expect(b.programs[0].title).toBe("A — позже");
  });

  it("удаление доезжает как запись с deleted", async () => {
    const a = empty(), b = empty();
    a.plans.push(rec("q1", 10));
    await syncData(ref, a);
    await syncData(ref, b);
    a.plans[0] = rec("q1", 20, { deleted: true });
    await syncData(ref, a);
    await syncData(ref, b);
    expect(b.plans[0].deleted).toBe(true);
  });

  it("если ветку сдвинули во время отправки, синхронизация повторяется и чужое не теряется", async () => {
    const d = empty();
    d.sessions.push(rec("mine", 10));
    gh.interfere = 1;
    await syncData(ref, d);
    expect([...gh.files().keys()].sort()).toEqual(["data/sessions/mine.json", "data/sessions/other.json"]);
    expect(d.sessions.map((s) => s.id).sort()).toEqual(["mine", "other"]);
  });

  it("sha совпадает с тем, что считает git", async () => {
    // git hash-object для "hello\n"
    expect(await blobSha("hello\n")).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });
});
