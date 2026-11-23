// Хранение на устройстве: основная копия в localStorage (читается сразу, без ожидания),
// резервная — в IndexedDB. Если система почистит одно хранилище, данные поднимутся из другого.
const LS = "trn-db-v1";

export function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(LS) || "null");
    return d && d.v === 3 ? d : null;
  } catch {
    return null;
  }
}

let idbP = null;
function idb() {
  return (idbP ??= new Promise((res, rej) => {
    const r = indexedDB.open("training-diary", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}

export async function loadBackup() {
  try {
    const d = await idb();
    return await new Promise((res) => {
      const q = d.transaction("kv").objectStore("kv").get("db");
      q.onsuccess = () => {
        try {
          const v = JSON.parse(q.result || "null");
          res(v && v.v === 3 ? v : null);
        } catch {
          res(null);
        }
      };
      q.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

let timer = null;
export function persist(db) {
  const s = JSON.stringify(db);
  try {
    localStorage.setItem(LS, s);
  } catch {
    /* переполнено или запрещено — остаётся IndexedDB */
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    idb()
      .then((d) => d.transaction("kv", "readwrite").objectStore("kv").put(s, "db"))
      .catch(() => {});
  }, 400);
}

/** Просим браузер не вычищать данные при нехватке места. */
export function requestPersist() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* не поддерживается */
  }
}
