// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// This safely exposes ONLY the log-reading function to your React dashboard
contextBridge.exposeInMainWorld('electronAPI', {
    getPrivacyLogs: () => ipcRenderer.invoke('read-privacy-logs')
});