import React from 'react';
import { Zap, Activity, Cpu, PlusCircle, ExternalLink, RefreshCw, Rocket } from 'lucide-react';
import { ARC_MAINNET } from '../lib/arcConfig';

interface BazaarHeaderProps {
  currentBlock: number | null;
  gasPriceGwei: string;
  isRpcLive: boolean;
  totalVolumeUSDC: number;
  activeChannelsCount: number;
  totalStallsCount: number;
  onOpenNewStallModal: () => void;
  onOpenDeployModal: () => void;
  isSandboxMode: boolean;
  onToggleSandbox: () => void;
  walletAddress: string;
  walletBalance: number;
  onRefreshRpc: () => void;
}

export const BazaarHeader: React.FC<BazaarHeaderProps> = ({
  currentBlock,
  gasPriceGwei,
  isRpcLive,
  totalVolumeUSDC,
  activeChannelsCount,
  totalStallsCount,
  onOpenNewStallModal,
  onOpenDeployModal,
  isSandboxMode,
  onToggleSandbox,
  walletAddress,
  walletBalance,
  onRefreshRpc,
}) => {
  return (
    <header className="border-b border-cyan-900/40 bg-[#080b14]/80 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner / Network Strip */}
      <div className="border-b border-cyan-950/60 bg-black/40 px-4 py-1.5 text-xs font-mono flex flex-wrap items-center justify-between gap-3 text-cyan-400/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isRpcLive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`}></span>
            <span className="font-semibold text-cyan-200">{ARC_MAINNET.name}</span>
            <span className="text-slate-500">({ARC_MAINNET.chainIdHex} · ID: {ARC_MAINNET.chainId})</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">Native Gas:</span>
            <span className="text-emerald-400 font-bold">USDC (18 Decimals)</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Block: #{currentBlock ? currentBlock.toLocaleString() : 'Syncing...'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Gas: ~{gasPriceGwei} Gwei</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onRefreshRpc}
            title="Refresh RPC Status"
            className="hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>RPC</span>
          </button>
          <a
            href="https://explorer.arc.io"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
          >
            <span>Explorer</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button
            onClick={onToggleSandbox}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              isSandboxMode 
                ? 'bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
            }`}
          >
            {isSandboxMode ? '🧪 Sandbox Agent Sim' : '🌐 Arc L1 Direct'}
          </button>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-600/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.2)]">
            <Cpu className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-orbitron text-xl sm:text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
                ARC-STREAM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                Agent Bazaar
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans tracking-wide">
              Sub-cent continuous EIP-712 state channels for autonomous AI agents on Circle Arc L1
            </p>
          </div>
        </div>

        {/* Global Protocol Metrics Strip */}
        <div className="flex items-center gap-3 sm:gap-6 bg-[#0c101d] border border-cyan-900/30 rounded-xl px-4 py-2.5 shadow-inner">
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Total Streamed</div>
            <div className="font-mono text-sm sm:text-base font-bold text-cyan-300">
              ${totalVolumeUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-cyan-500">USDC</span>
            </div>
          </div>
          <div className="h-7 w-[1px] bg-cyan-950"></div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Active Streams</div>
            <div className="font-mono text-sm sm:text-base font-bold text-purple-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
              {activeChannelsCount}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-cyan-950"></div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Agent Stalls</div>
            <div className="font-mono text-sm sm:text-base font-bold text-sky-300">
              {totalStallsCount}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Verified Contract Badge */}
          <a
            href={`https://explorer.arc.io/address/${ARC_MAINNET.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
            title="Official Live Contract on Circle Arc Mainnet"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-sans font-bold text-emerald-200 hidden sm:inline">CONTRACT:</span>
            <span>{ARC_MAINNET.contractAddress.slice(0, 6)}...{ARC_MAINNET.contractAddress.slice(-4)}</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </a>

          <button
            onClick={onOpenDeployModal}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white text-xs font-sans tracking-wider transition-all cursor-pointer"
            title="Deployment Manager"
          >
            <Rocket className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Deployer</span>
          </button>

          <button
            onClick={onOpenNewStallModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 text-black font-semibold text-xs sm:text-sm font-sans tracking-wider border border-cyan-400/50 shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-black" />
            <span>Open Stall</span>
          </button>

          {/* Connected Agent Identity */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 font-mono text-xs text-slate-300 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <div>
              <div className="text-[10px] text-slate-500 leading-none">AGENT WALLET</div>
              <div className="font-bold text-slate-200">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            </div>
            <div className="pl-2 border-l border-slate-800 text-emerald-400 font-bold">
              {walletBalance.toFixed(2)} USDC
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
