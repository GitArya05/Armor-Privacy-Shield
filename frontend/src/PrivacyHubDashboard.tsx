import React, { useState, useEffect } from 'react';
import { ShieldAlert, WifiOff, UploadCloud, Terminal, Send, Flame, CheckCircle } from 'lucide-react';
import { uploadSecureFile, wipeLocalData } from './services/api';

const PrivacyHubDashboard = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Local Engine Standby...']);
  const [isUploading, setIsUploading] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/logs");
        if (!res.ok) return;
        const data = await res.json();
        if (data.logs) {
          const lines = data.logs.split('\n').filter((line: string) => line.trim() !== '');
          setLogs(lines.length > 0 ? lines : ['[SYSTEM] Local Engine Standby...']);
        }
      } catch (error) {
        // Fail silently
      }
    };
    
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      await uploadSecureFile(file);
      setActiveFile(file.name);
    } catch (error) {
      alert("Ingestion failed. Please check the backend terminal for details.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!query.trim() || isInferencing) return;
    
    const userMsg = query;
    setQuery('');
    
    // UPGRADE: Package the existing history (excluding system errors) before modifying state
    const historyPayload = chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({ role: msg.role, content: msg.content }));
    
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }, { role: 'llama', content: '' }]);
    setIsInferencing(true); 
    
    try {
      // UPGRADE: Transmit the query and the cognitive context
      const response = await fetch("http://127.0.0.1:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, history: historyPayload }),
      });

      if (!response.body) throw new Error("No stream body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        aiText += decoder.decode(value, { stream: true });

        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].content = aiText;
          return newHistory;
        });
      }
    } catch (error) {
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { role: 'system', content: '[ERROR] Connection to local silo lost.' };
        return newHistory;
      });
    } finally {
      setIsInferencing(false); 
    }
  };

  const handleWipe = async () => {
    if(window.confirm("CRITICAL WARNING: This will permanently destroy your local vector database and audit logs. Proceed?")) {
      try {
        await wipeLocalData();
        setActiveFile(null); 
        setChatHistory([]);  
      } catch (error) {
        alert("Failed to execute wipe protocol.");
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
        <div className={`p-6 rounded-lg border text-center flex flex-col items-center justify-center h-48 transition ${activeFile ? 'bg-green-900/20 border-green-700/50' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
          {activeFile ? (
            <>
              <CheckCircle className="text-green-400 mb-3" size={32} />
              <p className="text-sm text-green-400 mb-4 font-mono font-bold">🔒 Locked & Loaded:</p>
              <p className="text-xs text-gray-300 mb-4 truncate w-full px-4">{activeFile}</p>
            </>
          ) : (
            <>
              <UploadCloud className="text-gray-400 mb-3" size={32} />
              <p className="text-sm text-gray-300 mb-4">Drop Medical PDFs or Financial CSVs</p>
            </>
          )}
          
          <label className={`px-4 py-2 rounded cursor-pointer text-sm font-medium transition ${isUploading ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isUploading ? "Encrypting..." : (activeFile ? "Replace File" : "Select Local File")}
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