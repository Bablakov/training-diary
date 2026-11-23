// Windows-версия дневника: окно Electron с тем же веб-приложением, что на телефоне.
// Файлы приложения лежат в www/ и отдаются по app://diary — у страницы постоянный адрес, поэтому
// localStorage, IndexedDB и настройки синхронизации сохраняются между запусками и обновлениями.
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const WWW = path.join(__dirname, "www");
const STATE = () => path.join(app.getPath("userData"), "window.json");

if (!app.requestSingleInstanceLock()) app.quit();

function loadBounds() {
  try {
    return JSON.parse(fs.readFileSync(STATE(), "utf8"));
  } catch {
    return { width: 1280, height: 860 };
  }
}

function createWindow() {
  const b = loadBounds();
  const win = new BrowserWindow({
    ...b,
    minWidth: 380,
    minHeight: 560,
    title: "Дневник тренировок",
    icon: path.join(WWW, "icons", "icon-512.png"),
    backgroundColor: "#0f1626",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false },
  });
  if (b.maximized) win.maximize();
  Menu.setApplicationMenu(null);

  // Ссылки наружу (GitHub, страница обновления) — в обычном браузере.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith("app://")) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  // Размер и положение окна запоминаем.
  win.on("close", () => {
    try {
      fs.writeFileSync(STATE(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() }));
    } catch {
      /* не страшно */
    }
  });

  win.loadURL("app://diary/index.html");
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(WWW, decodeURIComponent(pathname)));
    if (!file.startsWith(WWW)) return new Response("Нет доступа", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});

app.on("second-instance", () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (!w) return;
  if (w.isMinimized()) w.restore();
  w.focus();
});

app.on("window-all-closed", () => app.quit());
