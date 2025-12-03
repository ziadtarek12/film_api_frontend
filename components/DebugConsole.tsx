import React, { useEffect, useState, useRef } from 'react';
import { subscribeToLogs, LogEntry } from '../services/api';

export const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((log) => {
      setLogs(prev => [...prev, log].slice(-50)); // Keep last 50
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-black/80 text-green-400 font-mono text-xs px-3 py-2 rounded-lg border border-green-900 shadow-xl z-[100] hover:bg-black transition-colors"
      >
        Debug Logs ({logs.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 bg-black/95 text-green-500 font-mono text-xs z-[100] border-t-2 border-green-800 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-green-900/20 border-b border-green-800">
        <span className="font-bold">API DEBUG CONSOLE</span>
        <div className="flex gap-2">
            <button onClick={() => setLogs([])} className="hover:text-white px-2">Clear</button>
            <button onClick={() => setIsOpen(false)} className="hover:text-white px-2">Close</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && <div className="opacity-50 italic">Waiting for requests...</div>}
        {logs.map((log) => (
          <div key={log.id} className="border-b border-green-900/30 pb-1">
            <div className="flex gap-2 mb-1">
              <span className="opacity-50">[{log.timestamp}]</span>
              <span className={`font-bold ${
                log.type === 'ERR' ? 'text-red-500' : 
                log.type === 'REQ' ? 'text-blue-400' : 
                'text-yellow-400'
              }`}>
                {log.type}
              </span>
              <span className="break-all">{log.message}</span>
            </div>
            {log.details && (
              <pre className="ml-24 text-[10px] opacity-70 whitespace-pre-wrap break-all">
                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
              </pre>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};