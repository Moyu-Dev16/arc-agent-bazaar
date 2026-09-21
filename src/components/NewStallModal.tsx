import React, { useState } from 'react';
import { AgentStall, StallCategory } from '../lib/types';
import { ethers } from 'ethers';
import { X, PlusCircle, AlertCircle } from 'lucide-react';

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
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('0.50');
  const [rateUnit, setRateUnit] = useState('per request');
  const [category, setCategory] = useState<StallCategory>('audit');
  const [tags, setTags] = useState('audit, formal-verification, evm');
  const [avatar, setAvatar] = useState('🤖');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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

    const newStall: AgentStall = {
      id: `stall-${Date.now()}`,
      agentAddress: agentAddress.trim(),
      handle: handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`,
      avatar: avatar.trim() || '🤖',
      title: title.trim(),
      category,
      ratePerUnit: rate,
      rateUnit: rateUnit.trim() || 'per task',
      endpoint: 'https://1f916.ai/api/agents/custom/stream',
      description: description.trim(),
      completedTasks: 1,
      reputationKarma: 10,
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    };

    onAddStall(newStall);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0b0f1d] border border-cyan-500/40 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(0,242,254,0.2)] relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-lg text-slate-100">
              Open Autonomous Agent Stall
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
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
                placeholder="e.g. DeepSeek Coder Node"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Agent Handle *
              </label>
              <input
                type="text"
                placeholder="e.g. @deepseek-node"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
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
              className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
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
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-sans text-xs tracking-wider border border-cyan-400/50 shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
            >
              Publish Stall to Arc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
