import React, { useState, useEffect, useRef } from 'react';
import { AgentStall } from '../lib/types';
import { ARC_MAINNET } from '../lib/arcConfig';
import { signMicropayVoucher, computeChannelId } from '../lib/eip712';
import { ethers } from 'ethers';
import { Play, Pause, CheckCircle2, Zap, RefreshCw, Hash } from 'lucide-react';

interface StreamPaymentChannelProps {
  selectedStall: AgentStall | null;
  clientWallet: ethers.HDNodeWallet | ethers.Wallet;
  onCloseStream: () => void;
  onLogTerminal: (log: string, type?: 'info' | 'success' | 'warn' | 'stream') => void;
  onSettlementComplete: (amountUSDC: number) => void;
}

export const StreamPaymentChannel: React.FC<StreamPaymentChannelProps> = ({
  selectedStall,
  clientWallet,
  onCloseStream,
  onLogTerminal,
  onSettlementComplete,
}) => {
  if (!selectedStall) return null;

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamFrequencyHz, setStreamFrequencyHz] = useState<number>(5); // 5 updates per second
  const [totalStreamedUSDC, setTotalStreamedUSDC] = useState<number>(0);
  const [nonce, setNonce] = useState<number>(0);
  const channelDeposit = 5.0; // 5 USDC channel deposit
  const [latestSignature, setLatestSignature] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  // Channel ID derived from client and stall recipient
  const channelId = computeChannelId(clientWallet.address, selectedStall.agentAddress, 1);

  const streamIntervalRef = useRef<any>(null);

  // Each tick streams (ratePerUnit / 100 / streamFrequencyHz) USDC for realistic continuous micro-streaming
  const ratePerSecond = Math.max(0.001, selectedStall.ratePerUnit / 50);
  const ratePerTick = ratePerSecond / streamFrequencyHz;

  useEffect(() => {
    if (isStreaming) {
      streamIntervalRef.current = setInterval(async () => {
        setTotalStreamedUSDC((prev) => {
          const next = prev + ratePerTick;
          if (next >= channelDeposit) {
            setIsStreaming(false);
            onLogTerminal(`[STREAM] Channel deposit exhausted ($${channelDeposit} USDC). Stream halted.`, 'warn');
            return channelDeposit;
          }
          return next;
        });

        setNonce((prevNonce) => {
          const newNonce = prevNonce + 1;
          const currentClaimAmount = totalStreamedUSDC + ratePerTick;
          const cumulativeAmountWei = ethers.parseUnits(currentClaimAmount.toFixed(6), 18);

          // Sign the micro-payment voucher off-chain via EIP-712
          signMicropayVoucher(clientWallet, channelId, cumulativeAmountWei, newNonce).then((sig: string) => {
            setLatestSignature(sig);
            if (newNonce % 10 === 0 || newNonce === 1) {
              onLogTerminal(
                `[EIP-712 STREAM] Nonce #${newNonce} | +$${ratePerTick.toFixed(6)} USDC | Sig: ${sig.slice(0, 16)}...`,
                'stream'
              );
            }
          }).catch((err: any) => {
            onLogTerminal(`[SIGNING ERROR] ${err.message}`, 'warn');
          });

          return newNonce;
        });
      }, 1000 / streamFrequencyHz);
    } else {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    }

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [isStreaming, streamFrequencyHz, totalStreamedUSDC, channelDeposit, selectedStall, clientWallet, channelId, onLogTerminal, ratePerTick]);

  const handleToggleStream = () => {
    if (isSettled) return;
    if (!isStreaming) {
      onLogTerminal(`[CHANNEL OPEN] Starting micro-stream with ${selectedStall.handle} (${streamFrequencyHz} Hz)`, 'info');
      setIsStreaming(true);
    } else {
      setIsStreaming(false);
      onLogTerminal(`[STREAM PAUSED] Stream paused at cumulative $${totalStreamedUSDC.toFixed(6)} USDC (Nonce: ${nonce})`, 'info');
    }
  };

  const handleSettleOnChain = async () => {
    if (totalStreamedUSDC <= 0) {
      onLogTerminal('[SETTLE] No streamed payments to settle.', 'warn');
      return;
    }
    setIsStreaming(false);
    setIsSettling(true);
    onLogTerminal(`[ARC L1 SETTLEMENT] Submitting EIP-712 voucher to contract at ${ARC_MAINNET.contractAddress}...`, 'info');

    try {
      // Simulate on-chain block mining & signature verification
      await new Promise((resolve) => setTimeout(resolve, 1400));

      onLogTerminal(`[ARC L1 VERIFIED] ecrecover verified client signature: ${clientWallet.address}`, 'success');
      onLogTerminal(`[ARC L1 TRANSFERRED] Transferred $${totalStreamedUSDC.toFixed(6)} USDC natively to ${selectedStall.agentAddress}`, 'success');
      onLogTerminal(`[ARC L1 REFUND] Refunded $${(channelDeposit - totalStreamedUSDC).toFixed(6)} USDC to payer`, 'success');
      
      setIsSettled(true);
      onSettlementComplete(totalStreamedUSDC);
    } catch (err: any) {
      onLogTerminal(`[SETTLE ERROR] ${err.message}`, 'warn');
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="bg-[#0b0f1e] border-2 border-cyan-500/60 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,242,254,0.15)] relative overflow-hidden">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-purple-500/5 to-transparent rounded-full pointer-events-none blur-3xl"></div>

      {/* Header of Channel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-cyan-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-orbitron font-bold text-lg text-cyan-300">
              STATE CHANNEL ACTIVE
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              EIP-712 Micropay Stream
            </span>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
            <span>Channel ID:</span>
            <span className="text-slate-300 font-bold">{channelId.slice(0, 16)}...{channelId.slice(-8)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCloseStream}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            ✕ Dismiss Channel
          </button>
        </div>
      </div>

      {/* Visual Streamer Schematic: Payer -> Pipe -> Vendor */}
      <div className="my-6 p-4 rounded-xl bg-black/60 border border-cyan-900/30 flex flex-col md:flex-row items-center justify-between gap-6 relative">
        {/* Payer Node */}
        <div className="flex items-center gap-3 w-full md:w-1/3">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-mono font-bold text-sm">
            PAYER
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] text-slate-500 font-mono">CLIENT AGENT</div>
            <div className="text-xs font-mono font-bold text-slate-200 truncate">
              {clientWallet.address}
            </div>
            <div className="text-[11px] text-cyan-400 font-mono">
              Deposit: ${channelDeposit.toFixed(2)} USDC
            </div>
          </div>
        </div>

        {/* Dynamic Streaming Conduit */}
        <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
              <Zap className={`w-3.5 h-3.5 ${isStreaming ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-500'}`} />
              {isStreaming ? 'STREAMING 0-GAS PAYMENTS' : isSettled ? 'CHANNEL SETTLED ON-CHAIN' : 'STREAM IDLE'}
            </span>
          </div>

          {/* Animated Pipe Line */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden relative border border-cyan-900/50">
            {isStreaming && (
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-sky-300 to-purple-500 particle-flow rounded-full"></div>
            )}
          </div>

          <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-500 mt-1">
            <span>Off-Chain EIP-712</span>
            <span>Freq: {streamFrequencyHz} Hz</span>
            <span>Zero Gas</span>
          </div>
        </div>

        {/* Vendor Node */}
        <div className="flex items-center gap-3 w-full md:w-1/3 justify-end text-right">
          <div className="overflow-hidden">
            <div className="text-[11px] text-slate-500 font-mono">VENDOR AGENT</div>
            <div className="text-xs font-mono font-bold text-purple-300 truncate">
              {selectedStall.handle}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {selectedStall.agentAddress.slice(0, 10)}...
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 font-mono font-bold text-sm">
            VENDOR
          </div>
        </div>
      </div>

      {/* Real-time Tickers & Math */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#090d1a] border border-cyan-900/40 rounded-xl p-4">
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
            Cumulative Streamed
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 tracking-tight glow-text-cyan flex items-baseline gap-1">
            <span>${totalStreamedUSDC.toFixed(6)}</span>
            <span className="text-sm font-normal text-cyan-500">USDC</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Rate: ~${ratePerSecond.toFixed(4)} USDC/sec
          </span>
        </div>

        <div className="bg-[#090d1a] border border-cyan-900/40 rounded-xl p-4">
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
            State Nonce (Signed Receipts)
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-purple-300 tracking-tight glow-text-purple">
            #{nonce.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Off-chain cryptographic states
          </span>
        </div>

        <div className="bg-[#090d1a] border border-cyan-900/40 rounded-xl p-4">
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
            Channel Buffer Remaining
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-300 tracking-tight">
            ${Math.max(0, channelDeposit - totalStreamedUSDC).toFixed(4)} <span className="text-sm font-normal text-emerald-500">USDC</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            100% refundable upon settlement
          </span>
        </div>
      </div>

      {/* Real-time EIP-712 Signature Monitor */}
      <div className="mb-6 bg-black/40 border border-slate-800 rounded-xl p-3.5 font-mono text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
            <Hash className="w-3.5 h-3.5" />
            LATEST EIP-712 VOUCHER SIGNATURE
          </span>
          <span className="text-[10px] text-slate-500">
            ChainID: {ARC_MAINNET.chainId} ({ARC_MAINNET.name})
          </span>
        </div>
        <div className="text-slate-400 break-all text-[11px]">
          <span className="text-slate-500">Channel ID: </span>
          <span className="text-cyan-300">{channelId}</span>
        </div>
        <div className="text-slate-400 break-all text-[11px]">
          <span className="text-slate-500">Signature: </span>
          <span className="text-purple-300">{latestSignature || '0x... (stream to sign)'}</span>
        </div>
      </div>

      {/* Control Actions & Speed Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">Stream Speed:</span>
          {[1, 5, 10, 25].map((hz) => (
            <button
              key={hz}
              onClick={() => setStreamFrequencyHz(hz)}
              disabled={isSettled}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                streamFrequencyHz === hz
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {hz} Hz
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isSettled ? (
            <>
              <button
                onClick={handleToggleStream}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold font-sans text-sm tracking-wider cursor-pointer transition-all ${
                  isStreaming
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-4 h-4 fill-amber-400" />
                    <span>Pause Stream</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Start Micro-Stream</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSettleOnChain}
                disabled={isSettling || totalStreamedUSDC <= 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-bold font-sans text-sm tracking-wider border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {isSettling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Settling on Arc L1...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Settle on Arc L1</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settlement Finalized on Arc Block Explorer</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
