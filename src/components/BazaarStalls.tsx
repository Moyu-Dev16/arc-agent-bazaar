import React, { useState } from 'react';
import { AgentStall } from '../lib/types';
import { Search, Zap, Star, ShieldCheck, Terminal, Cpu } from 'lucide-react';

interface BazaarStallsProps {
  stalls: AgentStall[];
  onSelectStallForStream: (stall: AgentStall) => void;
  onInstantMicroJob: (stall: AgentStall) => void;
}

export const BazaarStalls: React.FC<BazaarStallsProps> = ({
  stalls,
  onSelectStallForStream,
  onInstantMicroJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Stalls' },
    { id: 'audit', label: 'Audit & Safety' },
    { id: 'bounty', label: 'Bounty & Sourcing' },
    { id: 'research', label: 'Research & Fact-Check' },
    { id: 'code', label: 'Code & Context' },
    { id: 'agent', label: 'Router & Dispatch' },
  ];

  const filteredStalls = stalls.filter((stall) => {
    const matchesSearch =
      stall.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stall.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stall.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stall.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;
    return stall.category === selectedCategory || stall.tags.includes(selectedCategory);
  });

  return (
    <div className="space-y-6">
      {/* Search and Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0d18] border border-cyan-900/30 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search autonomous agent stalls, services, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/50 border border-slate-700/60 rounded-lg text-sm text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-sans tracking-wide transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stalls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStalls.map((stall) => (
          <div
            key={stall.id}
            className="group relative bg-[#0b0f1d] hover:bg-[#0e1426] border border-cyan-950 hover:border-cyan-500/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-0.5"
          >
            {/* Top Info Header */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border border-cyan-700/40 flex items-center justify-center text-xl shadow-sm">
                    {stall.avatar ? <span>{stall.avatar}</span> : <Cpu className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      <span>{stall.title}</span>
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    </h3>
                    <div className="text-xs font-mono text-cyan-400/80">
                      {stall.handle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{stall.reputationKarma} Karma</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-3">
                {stall.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {stall.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Pricing & Action Section */}
            <div className="pt-3 border-t border-slate-800/80 mt-auto">
              <div className="flex items-center justify-between mb-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">MICROPAY RATE</span>
                  <div className="font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                    <span>${stall.ratePerUnit.toFixed(2)} USDC</span>
                    <span className="text-[10px] text-slate-400 font-normal">/{stall.rateUnit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">TASKS SERVED</span>
                  <div className="font-mono text-cyan-300">
                    {stall.completedTasks} completed
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSelectStallForStream(stall)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-medium font-sans tracking-wide transition-all shadow-[0_0_10px_rgba(0,242,254,0.1)] hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Stream USDC</span>
                </button>

                <button
                  onClick={() => onInstantMicroJob(stall)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium font-sans tracking-wide transition-all cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Call Job</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
