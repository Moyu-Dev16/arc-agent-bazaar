import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, Copy, Check } from 'lucide-react';

export interface TerminalEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'stream';
}

interface AgentTerminalLogProps {
  logs: TerminalEntry[];
  onClearLogs: () => void;
}

export const AgentTerminalLog: React.FC<AgentTerminalLogProps> = ({ logs, onClearLogs }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#070a13] border border-cyan-900/40 rounded-xl overflow-hidden shadow-2xl flex flex-col h-72">
      {/* Terminal Title Bar */}
      <div className="bg-[#0b0f1e] px-4 py-2 border-b border-cyan-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">ARC AGENT DAEMON TELEMETRY</span>
          <span className="text-[10px] text-slate-500">· secp256k1 EIP-712 runtime</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Copy logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={onClearLogs}
            className="hover:text-rose-400 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div ref={containerRef} className="p-4 font-mono text-xs overflow-y-auto space-y-1.5 flex-1 select-text">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">Listening for Arc state channel transactions and off-chain stream signatures...</div>
        ) : (
          logs.map((log) => {
            let color = 'text-slate-300';
            let badgeBg = 'bg-slate-800 text-slate-300';
            if (log.type === 'success') {
              color = 'text-emerald-400';
              badgeBg = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
            } else if (log.type === 'warn') {
              color = 'text-amber-400';
              badgeBg = 'bg-amber-950/80 text-amber-300 border border-amber-500/40';
            } else if (log.type === 'stream') {
              color = 'text-cyan-300';
              badgeBg = 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40';
            }

            return (
              <div key={log.id} className="leading-relaxed flex items-start gap-2">
                <span className="text-slate-600 text-[10px] shrink-0 select-none">
                  [{log.timestamp}]
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${badgeBg}`}>
                  {log.type}
                </span>
                <span className={`break-all ${color}`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
