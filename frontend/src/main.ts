import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// Resolve ES module paths for Vite compilation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CRASH TRAP: Captures silent boot errors and logs them locally ---
process.on('uncaughtException', (error) => {
  const logPath = path.join(process.cwd(), 'fatal_crash.log');
  fs.writeFileSync(logPath, `[FATAL ERROR]\n${error.stack || error.message}`);
  console.error(' FATAL MAIN PROCESS CRASH ', error);
  process.exit(1);
});

// Vite plugin injection declarations
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // The Vite plugin injects this global variable automatically
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});