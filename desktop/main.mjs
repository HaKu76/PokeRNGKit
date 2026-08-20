import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { corsEnabled: true, secure: true, standard: true },
  },
]);

function contentRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "dist")
    : path.join(currentDirectory, "..", "dist");
}

function registerAppProtocol() {
  protocol.registerFileProtocol("app", (request, callback) => {
    const requestUrl = new URL(request.url);
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(
      /^\/+/,
      "",
    );
    const root = path.resolve(contentRoot());
    const filePath = path.resolve(root, relativePath || "index.html");
    const isInsideContentRoot =
      filePath === root || filePath.startsWith(`${root}${path.sep}`);
    callback(isInsideContentRoot ? filePath : path.join(root, "index.html"));
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#111619",
    title: "PokeRNGKit",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.removeMenu();
  window.loadURL("app://pokerngkit/index.html");

  if (isDevelopment) window.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(() => {
  registerAppProtocol();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
