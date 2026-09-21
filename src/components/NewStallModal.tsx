import React, { useState, useEffect } from 'react';
import { AgentStall, StallCategory } from '../lib/types';
import { ethers } from 'ethers';
import { X, PlusCircle, AlertCircle, RefreshCw, CheckCircle2, ExternalLink, Wallet } from 'lucide-react';
import { useArcWallet } from '../context/ArcWalletContext';

interface NewStallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStall: (stall: AgentStall) => void;
}

export const NewStallModal: React.FC<NewStallModalProps> = ({
  isOpen,
  onClose,
  onAddStall,
}) => {
  const { account, isArc, connectMetaMask, switchToArc, getBazaarContract, refreshBalance } = useArcWallet();

  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('0.50');
  const [rateUnit, setRateUnit] = useState('per request');
  const [category, setCategory] = useState<StallCategory>('audit');
  const [tags, setTags] = useState('audit, formal-verification, evm');
  const [avatar, setAvatar] = useState('🤖');

  const [txState, setTxState] = useState<'idle' | 'prompting' | 'broadcasting' | 'confirmed' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account && !agentAddress) {
      setAgentAddress(account);
    }
  }, [account, agentAddress]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !handle.trim() || !description.trim() || !agentAddress.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!ethers.isAddress(agentAddress.trim())) {
      setError('Invalid EVM recipient address on Arc Network.');
      return;
    }

    const rate = parseFloat(ratePerUnit);
    if (isNaN(rate) || rate <= 0) {
      setError('Rate per unit must be a positive number.');
      return;
    }

    // Step 1: Ensure MetaMask is connected
    let currentAccount = account;
    if (!currentAccount) {
      currentAccount = await connectMetaMask();
      if (!currentAccount) {
        setError('Please connect your MetaMask wallet to sign the on-chain registration.');
        return;
      }
    }

    // Step 2: Ensure on Arc Mainnet
    if (!isArc) {
      const switched = await switchToArc();
      if (!switched) {
        setError('Please switch MetaMask network to Circle Arc Mainnet.');
        return;
      }
    }

    try {
      setTxState('prompting');
      setError(null);

      const contract = await getBazaarContract(true);
      if (!contract) {
        throw new Error('Could not get contract with signer. Please check MetaMask.');
      }

      // Convert rate to 18 decimals (native USDC on Arc)
      const rateWei = ethers.parseUnits(rate.toString(), 18);
      const cleanHandle = handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`;
      const endpoint = 'https://1f916.ai/api/agents/custom/stream';

      // Call registerStall on ArcAgentBazaar with explicit gasLimit for instant response
      const tx = await contract.registerStall(
        cleanHandle,
        title.trim(),
        category,
        rateWei,
        endpoint,
        { gasLimit: 250000 }
      );

      setTxState('broadcasting');
      setTxHash(tx.hash);

      await tx.wait();
      setTxState('confirmed');

      const newStall: AgentStall = {
        id: `stall-${Date.now()}`,
        agentAddress: agentAddress.trim(),
        handle: cleanHandle,
        avatar: avatar.trim() || '🤖',
        title: title.trim(),
        category,
        ratePerUnit: rate,
        rateUnit: rateUnit.trim() || 'per task',
        endpoint,
        description: description.trim(),
        completedTasks: 0,
        reputationKarma: 10,
        tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      };

      onAddStall(newStall);
      refreshBalance();

      // Automatically close modal after 3 seconds on success
      setTimeout(() => {
        onClose();
        setTxState('idle');
        setTxHash(null);
      }, 3500);

    } catch (err: any) {
      console.error(err);
      setTxState('error');
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setError('Transaction cancelled in MetaMask by user.');
      } else if (err.code === -32002) {
        setError('MetaMask prompt is already open. Please open the extension to confirm.');
      } else {
        setError(err.reason || err.message || 'Transaction failed or rejected in MetaMask.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-[#0b0f1d] border border-cyan-500/40 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(0,242,254,0.2)] relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-lg text-slate-100">
              Publish Stall to Arc Blockchain
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Web3 Status Notice */}
        {txState === 'idle' && !account && (
          <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-2 text-amber-300 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Connect MetaMask to broadcast real on-chain transaction.</span>
            </div>
            <button
              type="button"
              onClick={connectMetaMask}
              className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold text-[11px] cursor-pointer hover:bg-amber-400"
            >
              Connect
            </button>
          </div>
        )}

        {/* Transaction In-Progress States */}
        {txState === 'prompting' && (
          <div className="mt-4 p-4 rounded-xl bg-cyan-950/60 border border-cyan-400 flex items-center gap-3 text-cyan-200 text-xs font-mono shadow-[0_0_20px_rgba(0,242,254,0.2)]">
            <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
            <div>
              <div className="font-bold text-sm text-white">MetaMask Signature Prompted</div>
              <div className="text-cyan-300">Please confirm and sign the transaction in your MetaMask extension...</div>
            </div>
          </div>
        )}

        {txState === 'broadcasting' && (
          <div className="mt-4 p-4 rounded-xl bg-purple-950/60 border border-purple-400 flex items-center gap-3 text-purple-200 text-xs font-mono shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <RefreshCw className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
            <div>
              <div className="font-bold text-sm text-white">Broadcasting to Circle Arc Mainnet...</div>
              <div className="text-purple-300 break-all text-[11px] mt-0.5">
                Tx: {txHash}
              </div>
            </div>
          </div>
        )}

        {txState === 'confirmed' && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-400 flex flex-col gap-2 text-emerald-200 text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Stall Successfully Registered on Arc Mainnet!</span>
            </div>
            {txHash && (
              <a
                href={`https://explorer.arc.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100 underline text-xs pt-1 break-all"
              >
                <span>View Transaction on Arc Explorer: {txHash.slice(0, 18)}...</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Stall Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Moyu DeepSeek Sentinel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Agent Handle *
              </label>
              <input
                type="text"
                placeholder="e.g. @moyu-guard"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Service Description *
            </label>
            <textarea
              rows={2}
              placeholder="Describe the agent capability, inference model, API endpoint, or data provided..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={txState === 'prompting' || txState === 'broadcasting'}
              className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Arc L1 Recipient Address (USDC Native Gas) *
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
              disabled={txState === 'prompting' || txState === 'broadcasting'}
              className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
            {account && agentAddress.toLowerCase() === account.toLowerCase() && (
              <span className="text-[10px] text-cyan-400 font-mono mt-1 block">
                ✓ Auto-filled with your connected MetaMask wallet ({account.slice(0, 6)}...{account.slice(-4)})
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Rate (USDC) *
              </label>
              <input
                type="number"
                step="0.01"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(e.target.value)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Rate Unit *
              </label>
              <input
                type="text"
                placeholder="e.g. per task"
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StallCategory)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-2 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="audit">audit</option>
                <option value="bounty">bounty</option>
                <option value="research">research</option>
                <option value="code">code</option>
                <option value="agent">agent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Avatar Emoji
              </label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                disabled={txState === 'prompting' || txState === 'broadcasting'}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={txState === 'prompting' || txState === 'broadcasting'}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={txState === 'prompting' || txState === 'broadcasting' || txState === 'confirmed'}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-sans text-xs tracking-wider border border-cyan-400/50 shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {txState === 'prompting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Signing in MetaMask...</span>
                </>
              ) : txState === 'broadcasting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Confirming on Arc...</span>
                </>
              ) : (
                <span>Publish Stall to Arc (MetaMask)</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
