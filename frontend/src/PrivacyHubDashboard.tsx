import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, WifiOff, UploadCloud, Terminal, Send, Flame, CheckCircle, Activity, Cpu } from 'lucide-react';
import { uploadSecureFile, wipeLocalData } from './services/api';

const PrivacyHubDashboard = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Local Engine Standby...']);
  const [isUploading, setIsUploading] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Telemetry state for live hardware and inference tracking
  const [tps, setTps] = useState(0);
  const [hardware, setHardware] = useState({
    cpu_usage: '0%',
    ram_usage: '0%',
    network_status: '0 KB/s (Isolated)',
    air_gap: 'SECURE'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Trigger auto-scroll on history updates
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Polling effect for hardware telemetry microservices
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/telemetry");
        if (res.ok) {
          const data = await res.json();
          setHardware(data);
        }
      } catch (error) {
        // Fail silently during air-gap pipeline dropouts
      }
    };
    
    const telemetryInterval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(telemetryInterval);
  }, []);

  // Effect for fetching audit log sequences
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
      alert("Ingestion failed. Check local backend logs.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!query.trim() || isInferencing) return;
    
    const userMsg = query;
    setQuery('');
    
    // Package the existing history before state transitions
    const historyPayload = chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({ role: msg.role, content: msg.content }));
    
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }, { role: 'llama', content: '' }]);
    setIsInferencing(true); 
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, history: historyPayload }),
      });

      if (!response.body) throw new Error("No stream body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiText = "";

      setTps(0);
      const startTime = Date.now();
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        aiText += decoder.decode(value, { stream: true });
        tokenCount++;

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        if (elapsedSeconds > 0) {
          setTps(Math.round(tokenCount / elapsedSeconds));
        }

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
    if(window.confirm("CRITICAL WARNING: This will permanently destroy your local vector database. Proceed?")) {
      try {
        await wipeLocalData();
        setActiveFile(null); 
        setChatHistory([]);  
      } catch (error) {
        alert("Wipe protocol failed.");
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      
      {/* LEFT PANEL: Security, Ingestion & Telemetry */}
      <div className="w-1/3 p-6 border-r border-gray-700 flex flex-col gap-4">
        
        {/* Air-Gap & Hardware Telemetry Matrix Cards */}
        <div className="space-y-3">
          <div className="bg-gray-800 p-4 rounded-lg border border-green-500/30 flex items-center gap-4 shadow-lg">
            <div className="p-3 bg-green-500/10 rounded-full">
              <WifiOff className="text-green-400" size={24} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-green-400 uppercase tracking-tighter">Status: {hardware.air_gap}</h2>
              <p className="text-[10px] font-mono text-gray-400">Traffic: {hardware.network_status}</p>
            </div>
          </div>

          {/* UPGRADE: Optimized 3-Column Performance Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700 flex items-center gap-1.5 justify-center">
              <Cpu size={12} className="text-blue-400" />
              <div className="text-[9px] font-mono whitespace-nowrap">
                <span className="text-gray-500">CPU:</span> {hardware.cpu_usage}
              </div>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700 flex items-center gap-1.5 justify-center">
              <Activity size={12} className="text-purple-400" />
              <div className="text-[9px] font-mono whitespace-nowrap">
                <span className="text-gray-500">RAM:</span> {hardware.ram_usage}
              </div>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700 flex items-center gap-1.5 justify-center">
              <Activity size={12} className="text-green-400" />
              <div className="text-[9px] font-mono whitespace-nowrap">
                <span className="text-gray-500">TPS:</span> <span className="text-blue-400 font-bold">{tps}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ingestion Zone */}
        <div className={`p-6 rounded-lg border text-center flex flex-col items-center justify-center h-40 transition ${activeFile ? 'bg-green-900/10 border-green-700/50' : 'bg-gray-800 border-gray-700'}`}>
          {activeFile ? (
            <>
              <CheckCircle className="text-green-400 mb-2" size={24} />
              <p className="text-[10px] text-gray-300 truncate w-full px-4 font-mono">{activeFile}</p>
            </>
          ) : (
            <>
              <UploadCloud className="text-gray-400 mb-2" size={24} />
              <p className="text-xs text-gray-400">Awaiting Secure Assets</p>
            </>
          )}
          <label className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-[10px] font-bold cursor-pointer transition">
            {isUploading ? "PROCESS..." : (activeFile ? "CHANGE" : "IMPORT")}
            <input type="file" className="hidden" accept=".pdf,.csv" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        <button onClick={handleWipe} className="flex items-center justify-center gap-2 w-full p-2 bg-red-900/20 hover:bg-red-800/40 border border-red-900/30 text-red-400 rounded text-[10px] font-bold tracking-widest transition">
          <Flame size={14} /> SHRED LOCAL VAULT
        </button>

        {/* Privacy Audit Log Panel */}
        <div className="flex-1 bg-black/50 rounded border border-gray-800 p-4 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-gray-600 border-b border-gray-900 pb-2">
            <Terminal size={12} />
            <span className="text-[10px] font-mono uppercase">Privacy_Audit.log</span>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-green-600/80 space-y-1 scrollbar-hide">
            {logs.map((log, i) => (
              <div key={i} className="border-l border-green-900/30 pl-2">{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Llama Engine Chat Frame */}
      <div className="flex-1 flex flex-col bg-gray-900">
        <div className="h-14 border-b border-gray-800 flex items-center px-6 gap-3 bg-gray-900/80 backdrop-blur-sm">
          <ShieldAlert className="text-blue-500" size={18} />
          <h1 className="text-sm font-bold tracking-widest uppercase">Privacy Shield Hub</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-500 font-mono">llama-3.2-3b-q4_k_m</span>
          </div>
        </div>

        {/* Render Chat Arrays With Context Role Highlights */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-700 space-y-2 opacity-20">
              <ShieldAlert size={40} />
              <p className="text-xs font-mono">SECURE_MEMORY_IDLE</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => {
              const isUser = msg.role === 'user';
              const isSystemError = msg.role === 'system';
              
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded text-xs leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-blue-700 text-white' 
                      : isSystemError 
                        ? 'bg-red-950/40 border border-red-900/50 text-red-400 font-mono text-[11px]' 
                        : 'bg-gray-800 border border-gray-700 text-gray-300'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Safe User Query Ingestion */}
        <div className="p-4 bg-gray-900">
          <div className="flex gap-2 bg-gray-800 p-1.5 rounded border border-gray-700 focus-within:border-blue-600 transition shadow-2xl">
            <input 
              type="text" 
              className="flex-1 bg-transparent outline-none px-4 text-xs font-medium"
              placeholder="Query local intelligence..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={isInferencing}
            />
            <button onClick={handleAsk} disabled={isInferencing} className={`p-2 rounded transition ${isInferencing ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyHubDashboard;
