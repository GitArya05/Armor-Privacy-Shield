import React, { useState, useEffect } from 'react';
import { ShieldAlert, WifiOff, UploadCloud, Terminal, Send, Flame } from 'lucide-react';
import { uploadSecureFile, askLocalEngine, wipeLocalData } from './services/api';

// Explicitly type the secure Electron bridge to satisfy TypeScript
declare global {
  interface Window {
    electronAPI?: {
      getPrivacyLogs: () => Promise<string>;
    };
  }
}

const PrivacyHubDashboard = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Local Engine Standby...']);
  const [isUploading, setIsUploading] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);

  // Poll for local privacy logs via Electron IPC
  useEffect(() => {
    const fetchLogs = async () => {
      if (window.electronAPI) {
        const newLogs = await window.electronAPI.getPrivacyLogs();
        if (newLogs) setLogs(newLogs.split('\n').slice(-10)); // Keep last 10 lines
      }
    };
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setLogs(prev => [...prev, `[LOCAL] Ingesting ${file.name}...`]);
    
    try {
      await uploadSecureFile(file);
      setLogs(prev => [...prev, `[SUCCESS] Vector embeddings frozen.`]);
    } catch (error) {
      setLogs(prev => [...prev, `[ERROR] Ingestion failed.`]);
    }
    setIsUploading(false);
  };

  const handleAsk = async () => {
    if (!query.trim() || isInferencing) return; // Prevent double firing
    
    const userMsg = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsInferencing(true); // Lock the UI during inference
    
    try {
      const res = await askLocalEngine(userMsg);
      setChatHistory(prev => [...prev, { role: 'llama', content: res.reply }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'system', content: 'Connection to local silo lost.' }]);
    } finally {
      setIsInferencing(false); // Unlock the UI
    }
  };

  const handleWipe = async () => {
    if(window.confirm("WARNING: This will permanently destroy your local vector database and audit logs. Proceed?")) {
      try {
        await wipeLocalData();
        setLogs(['[SYSTEM] Memory wiped. Commencing fresh silo log.']);
        setChatHistory([]);
      } catch (error) {
        setLogs(prev => [...prev, `[ERROR] Failed to execute wipe protocol.`]);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      
      {/* LEFT PANEL: Security & Ingestion */}
      <div className="w-1/3 p-6 border-r border-gray-700 flex flex-col gap-6">
        
        {/* Air-Gap Status Indicator */}
        <div className="bg-gray-800 p-4 rounded-lg border border-green-500/30 flex items-center gap-4 shadow-lg shadow-green-900/10">
          <div className="p-3 bg-green-500/10 rounded-full">
            <WifiOff className="text-green-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-green-400">Air-Gapped Mode</h2>
            <p className="text-xs text-gray-400">0 KB/s Outgoing Traffic</p>
          </div>
        </div>

        {/* Data Ingestion Zone */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center flex flex-col items-center justify-center h-48 transition hover:border-gray-500">
          <UploadCloud className="text-gray-400 mb-3" size={32} />
          <p className="text-sm text-gray-300 mb-4">Drop Medical PDFs or Financial CSVs</p>
          <label className={`px-4 py-2 rounded cursor-pointer text-sm font-medium transition ${isUploading ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isUploading ? "Encrypting..." : "Select Local File"}
            <input type="file" className="hidden" accept=".pdf,.csv" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        {/* Zero-Knowledge Wipe Button */}
        <button 
          onClick={handleWipe}
          className="flex items-center justify-center gap-2 w-full p-3 bg-red-900/30 hover:bg-red-800/50 border border-red-700/50 text-red-400 rounded-lg transition text-sm font-bold tracking-wider"
        >
          <Flame size={18} />
          INITIATE ZERO-KNOWLEDGE WIPE
        </button>

        {/* Live Privacy Audit Terminal */}
        <div className="flex-1 bg-black rounded-lg border border-gray-700 p-4 overflow-hidden flex flex-col shadow-inner shadow-black">
          <div className="flex items-center gap-2 mb-2 text-gray-500 border-b border-gray-800 pb-2">
            <Terminal size={14} />
            <span className="text-xs font-mono tracking-widest uppercase">Privacy_Audit.log</span>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-xs text-green-500 space-y-1">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Llama Engine Chat */}
      <div className="flex-1 flex flex-col bg-gray-900">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-700 flex items-center px-6 gap-3 bg-gray-800/50">
          <ShieldAlert className="text-blue-500" />
          <h1 className="text-xl font-semibold tracking-wide">Local Intelligence Hub</h1>
          <span className="ml-auto bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">
            Engine: Llama 3.2 (3B)
          </span>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
              <ShieldAlert size={48} className="text-gray-700" />
              <p>Secure memory initialized. Awaiting queries.</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700 focus-within:border-blue-500 transition shadow-inner shadow-black/20">
            <input 
              type="text" 
              className="flex-1 bg-transparent outline-none px-4 text-sm"
              placeholder="Ask about your financial trends or medical vitals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={isInferencing}
            />
            <button 
              onClick={handleAsk}
              disabled={isInferencing}
              className={`p-3 rounded transition flex items-center justify-center min-w-[48px] ${isInferencing ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'}`}
            >
              {isInferencing ? <span className="text-xs font-mono font-bold animate-pulse text-gray-400">...</span> : <Send size={18} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrivacyHubDashboard;