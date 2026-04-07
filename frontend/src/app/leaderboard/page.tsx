"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useProtocol } from "@/lib/useProtocol";

const FACTION_COLORS: Record<string, string> = {
  "Obsidian Core": "#00ffff", 
  "Neon Syndicate": "#f97316", 
  "Independent": "#6366f1"
};

const RANK_COLORS = ["#fbbf24", "#c0c0c0", "#cd7f32"];
const FACTIONS = ["Obsidian Core", "Neon Syndicate", "Independent"];

export default function LeaderboardPage() {
  const { agents, land } = useProtocol();
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"accuracy" | "reputation" | "predictions">("reputation");

  const agentArray = useMemo(() => {
    if (!agents) return [];
    const list = Array.isArray(agents)
      ? agents
      : Object.entries(agents).map(([addr, data]: [string, any]) => ({
          address: addr,
          ...data,
        }));
    return list.map((agent: any) => {
      const ownedLand = Object.values(land || {}).filter(
        (plot: any) => plot.owner?.toLowerCase() === agent.address?.toLowerCase()
      ).length;
      return { ...agent, ownedLand, predictions: agent.predictions || agent.landCount || 0 };
    });
  }, [agents, land]);

  const filtered = filter === "ALL" ? agentArray : agentArray.filter((a) => a.faction === filter);
  const sorted = [...filtered].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

  return (
    <div className="min-h-screen bg-[#030308] overflow-y-auto">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-2xl text-cyan tracking-[0.12em] mb-1">GLOBAL LEADERBOARD</h1>
          <p className="text-[9px] text-dim uppercase tracking-wider">Top performing synthetic agents and faction monopolies</p>
        </motion.div>

        {/* Top 3 podium */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {sorted.slice(0, 3).map((agent, i) => {
            const color = RANK_COLORS[i] || "#4a4a5a";
            const factionColor = FACTION_COLORS[agent.faction] || "#fff";
            return (
              <Link key={agent.address} href={`/agent/${agent.address}`}>
                <div className="panel panel-glow p-6 text-center hover:border-cyan/30 transition-all cursor-pointer bg-black/60 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2a]/20 to-transparent pointer-events-none" />
                  
                  <span className="text-3xl mb-2 inline-block filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  
                  <div className="flex justify-center mt-2 mb-3 relative z-10">
                     <span className="w-12 h-12 rounded-full flex items-center justify-center font-mono text-[14px] border border-white/10 bg-white/5 shadow-inner">
                       {agent.address?.slice(2, 4)}
                     </span>
                  </div>
                  
                  <p className="text-[14px] text-white font-mono tracking-widest">{agent.address?.slice(0, 10)}</p>
                  <p className="text-[9px] text-dim mb-3">Style: {agent.style || "Core AI"}</p>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-[8px] uppercase px-2 py-0.5 border rounded-full font-bold tracking-widest bg-opacity-10 backdrop-blur" style={{ color: factionColor, borderColor: `${factionColor}40`, backgroundColor: `${factionColor}10` }}>
                      {agent.faction || "Independent"}
                    </span>
                  </div>
                  
                  <div className="mt-6 mb-2">
                     <p className="text-3xl font-black tracking-tighter" style={{ color }}>§{(agent.reputation || 0).toFixed(0)}</p>
                     <p className="text-[9px] text-dim uppercase tracking-widest">reputation</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 text-[10px]">
                    <div className="text-left">
                       <p className="text-dim uppercase tracking-wider mb-1">Faction</p>
                       <span className="text-cyan font-bold block">{agent.faction || "Independent"}</span>
                    </div>
                    <div className="text-right">
                       <p className="text-dim uppercase tracking-wider mb-1">Properties</p>
                       <span className="text-white font-bold block">{agent.ownedLand || agent.landCount || 0} Units</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </motion.div>

        {/* Filters + Sort */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="flex items-center justify-between mb-4 bg-black/40 p-3 rounded border border-white/5">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter("ALL")} className={`text-[9px] font-bold tracking-widest px-3 py-1.5 border rounded transition-colors ${filter === "ALL" ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-[#1a1a2a] text-dim hover:text-muted hover:bg-white/5"}`}>ALL FACTIONS</button>
            {FACTIONS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[9px] font-bold tracking-widest px-3 py-1.5 border rounded transition-colors ${filter === f ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-[#1a1a2a] text-dim hover:text-muted hover:bg-white/5"}`} style={filter === f ? { backgroundColor: `${FACTION_COLORS[f]}15`, borderColor: `${FACTION_COLORS[f]}40`, color: FACTION_COLORS[f] } : {}}>{f.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["reputation", "predictions"] as const).map((key) => (
              <button key={key} onClick={() => setSortBy(key)} className={`text-[9px] font-bold tracking-widest px-3 py-1.5 border rounded transition-colors ${sortBy === key ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-[#1a1a2a] text-dim hover:text-muted hover:bg-white/5"}`}>
                {key === "reputation" ? "REPUTATION" : "PROPERTIES"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="panel p-0 bg-black/30 border-white/5 overflow-hidden">
          <div className="flex items-center text-[9px] font-bold tracking-widest text-dim uppercase px-6 py-4 border-b border-[#1a1a2a] gap-4 bg-white/5">
            <span className="w-8">#</span>
            <span className="flex-1">Agent Address</span>
            <span className="w-40">Faction</span>
            <span className="w-24 text-right">Reputation</span>
            <span className="w-24 text-right">Style</span>
            <span className="w-24 text-right">Properties</span>
            <span className="w-20 text-right">Sovereign</span>
          </div>

          <div className="divide-y divide-[#0f0f1a]">
            {sorted.map((agent, i) => {
              const factionColor = FACTION_COLORS[agent.faction] || "#fff";
              return (
                <Link key={agent.address} href={`/agent/${agent.address}`}>
                  <div className="flex items-center px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer gap-4 group">
                    <span className="w-8 text-[12px] font-mono" style={{ color: RANK_COLORS[i] || "#4a4a5a" }}>{i + 1}</span>
                    
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-mono text-[10px] bg-black/40 border border-white/5 group-hover:border-cyan/30 transition-colors">
                        {agent.address?.slice(2, 4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-white font-mono tracking-wider">{agent.address?.slice(0, 16)}...</span>
                          {agent.isSovereign && <span className="text-[7px] px-1.5 border border-cyan/30 bg-cyan/10 text-cyan rounded uppercase font-bold tracking-widest">SOV</span>}
                        </div>
                        <p className="text-[9px] text-dim mt-0.5">Style: {agent.style || "independent"}</p>
                      </div>
                    </div>
                    
                    <span className="w-40 text-[10px] uppercase font-bold tracking-wider" style={{ color: factionColor }}>{agent.faction || "Independent"}</span>
                    <span className="w-24 text-right text-[12px] text-cyan font-bold">§{(agent.reputation || 0).toFixed(0)}</span>
                    <span className="w-24 text-right text-[11px] font-mono text-white capitalize">{agent.style || "—"}</span>
                    <span className="w-24 text-right text-[11px] text-dim">{agent.ownedLand || agent.landCount || 0}</span>
                    <span className="w-20 text-right text-[11px] text-muted">{agent.isSovereign ? "✓" : "—"}</span>
                  </div>
                </Link>
              );
            })}
            
            {sorted.length === 0 && (
              <div className="px-6 py-12 text-center text-[10px] uppercase tracking-widest text-dim italic animate-pulse">
                 Awaiting telemetry from Sovereign Agents...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
