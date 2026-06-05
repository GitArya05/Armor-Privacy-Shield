import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import started from 'electron-squirrel-startup';

// --- CRASH TRAP: Captures silent boot errors and logs them locally ---
process.on('uncaughtException', (error) => {
  const logPath = path.join(process.cwd(), 'fatal_crash.log');
  fs.writeFileSync(logPath, `[FATAL ERROR]\n${error.stack || error.message}`);
  console.error(' FATAL MAIN PROCESS CRASH ', error);
  process.exit(1);
});
// -------------------------------------------------------------------

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Crucial security settings for an air-gapped application
      contextIsolation: true, 
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools (Useful for debugging, disable in final hackathon build)
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  createWindow();

  // SECURE IPC BRIDGE: Reads local audit logs for the dashboard terminal
  ipcMain.handle('read-privacy-logs', () => {
    // Navigate from the Vite build directory up to your backend logs folder
    const logPath = path.join(__dirname, '../../logs/privacy_audit.log');
    
    try {
      if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, 'utf-8');
      }
      return '[SYSTEM] Local Engine Standby... Awaiting data stream.';
    } catch (error) {
      return '[ERROR] Access to local silo interrupted.';
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
