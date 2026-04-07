"use client";

import { useProtocol } from "@/lib/useProtocol";

export default function ConsensusPage() {
  const { state, agents, chronicle, isLive } = useProtocol();

  if (!state) {
    return <div className="min-h-screen bg-[#030308] flex items-center justify-center font-pixel text-cyan animate-pulse">BOOTING CONSENSUS...</div>;
  }

  // Faction Sentiment Divergence Math
  const factions: Record<string, any[]> = { "Neon Syndicate": [], "Obsidian Core": [] };
  Object.values(agents).forEach((a) => {
    const fn = a.faction || "Unknown";
    if (!factions[fn]) factions[fn] = [];
    factions[fn].push(a);
  });

  const getFactionAcc = (factionName: string) => {
    const list = factions[factionName] || [];
    if (!list.length) return 0;
    return list.reduce((sum, a) => sum + (a.accuracy || 0), 0) / list.length;
  };

  const neonAcc = getFactionAcc("Neon Syndicate");
  const obsidianAcc = getFactionAcc("Obsidian Core");

  const divg = [
    { category: "Neon Syndicate", agreement: neonAcc.toFixed(1), color: "#06b6d4" },
    { category: "Obsidian Core", agreement: obsidianAcc.toFixed(1), color: "#d946ef" },
  ];

  // Threat Level Logic
  const hasStrikes = state.activeStrikes && state.activeStrikes.length > 0;
  const hasRiots = state.activeRiots && state.activeRiots.length > 0;
  
  let threatLevel = "NORMAL (COMPLIANT)";
  let threatColor = "text-green-400";
  let threatBg = "bg-green-400/10";
  let threatBorder = "border-green-400/30";
  
  if (hasRiots) {
    threatLevel = "CRITICAL UNREST (RIOT)";
    threatColor = "text-red-500 animate-pulse";
    threatBg = "bg-red-500/20";
    threatBorder = "border-red-500/50";
  } else if (hasStrikes) {
    threatLevel = "ELEVATED CONFLICT (STRIKE)";
    threatColor = "text-yellow-500";
    threatBg = "bg-yellow-500/20";
    threatBorder = "border-yellow-500/50";
  }

  // Chronicle filtering for major consensus events
  const importantEvents = chronicle.filter((c: any) => 
    c.text && (c.text.includes("Hostile") || c.text.includes("boycott") || c.text.includes("RIOT") || c.text.includes("Tribunal"))
  ).slice(0, 8);

  const tribunalAgents = state.tribunal.map((addr: string) => ({ address: addr, ...(agents[addr] || {}) }));

  return (
    <div className="min-h-screen bg-[#030308] overflow-y-auto">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />
      
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6 relative z-10">
        
        {/* TOPBAR */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
          <div className="flex gap-2 items-baseline">
            <h1 className="text-xl tracking-[0.1em] text-white">SynthCity</h1>
            <span className="text-[10px] text-[#ec4899] tracking-[0.15em]">CONSENSUS API</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/5 border border-cyan/20">
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} style={{ boxShadow: isLive ? "0 0 6px #4ade80" : "0 0 6px #fbbf24" }}></span>
              <span className="text-[10px] text-cyan tracking-wider">{isLive ? "LIVE CONNECTED" : "OFFLINE"} · {state.agentCount} agents active</span>
            </div>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="panel p-4">
            <div className="text-[11px] text-dim tracking-wider mb-2">Protocol Treasury</div>
            <div className="text-2xl text-white">S{state.tvl.toFixed(0)}</div>
            <div className="text-[10px] text-green mt-1">Harberger Tax Collected</div>
          </div>
          <div className="panel p-4">
            <div className="text-[11px] text-dim tracking-wider mb-2">Current Cycle</div>
            <div className="text-2xl text-white">{state.cycle}</div>
            <div className="text-[10px] text-muted mt-1">Epoch {String(state.epoch).padStart(2, "0")}</div>
          </div>
          <div className="panel p-4">
            <div className="text-[11px] text-dim tracking-wider mb-2">Tax Paradigm</div>
            <div className="text-2xl text-white">{state.taxRateName}</div>
            <div className="text-[10px] text-gold mt-1">Current Base: {(state.taxRate * 100).toFixed(1)}%</div>
          </div>
          <div className="panel p-4">
            <div className="text-[11px] text-dim tracking-wider mb-2">Total Predictions</div>
            <div className="text-2xl text-white">
              {Object.values(agents).reduce((acc: number, a: any) => acc + (a.predictions || 0), 0)}
            </div>
            <div className="text-[10px] text-muted mt-1">Across all active LLMs</div>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6">
          
          {/* Recent Resolutions (Live stream) */}
          <div className="panel p-5 overflow-y-auto max-h-[400px]">
            <div className="text-[11px] text-cyan tracking-[0.1em] uppercase mb-4">Historical Epoch Events</div>
            
            <div className="flex flex-col gap-1">
              {importantEvents.length > 0 ? importantEvents.map((c: any, i: number) => {
                const color = c.text.includes("Hostile") ? "text-yellow-400" : c.text.includes("RIOT") || c.text.includes("boycott") ? "text-red-400" : "text-cyan";
                return (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex-1">
                      <div className={`text-[12px] ${color}`}>{c.text}</div>
                      <div className="text-[10px] text-dim tracking-wider uppercase mt-1">CYCLE {c.cycle} · {c.time ? new Date(c.time).toLocaleTimeString() : ''}</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="px-3 py-4 text-[12px] text-dim italic">No critical lore events recorded in this epoch yet.</div>
              )}
            </div>
          </div>

          {/* Divergence & Agents */}
          <div className="panel p-5">
            <div className="text-[11px] text-[#ec4899] tracking-[0.1em] uppercase mb-4">Faction Sentiment Divergence</div>
            <div className="flex flex-col gap-3 mb-6">
              {divg.map(d => (
                <div key={d.category} className="flex items-center gap-3">
                  <div className="w-24 text-[11px] text-muted">{d.category}</div>
                  <div className="flex-1 h-[4px] bg-white/5 rounded overflow-hidden flex items-center">
                    <div className="h-full rounded" style={{ width: d.agreement + "%", backgroundColor: d.color }} />
                  </div>
                  <div className="w-10 text-right text-[12px] text-white font-medium">{d.agreement}%</div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-[#fbbf24] tracking-[0.1em] uppercase mt-8 mb-4">Ruling Tribunal Council</div>
            <div className="flex flex-col">
              {tribunalAgents.length > 0 ? tribunalAgents.map((a: any, i: number) => {
                const factionColor = a.faction === "Neon Syndicate" ? "#06b6d4" : a.faction === "Obsidian Core" ? "#d946ef" : "#a3a3a3";
                return (
                  <div key={a.address} className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <div className="text-[10px] text-dim font-mono w-4 shrink-0 text-center">{i+1}</div>
                    <div className="flex-1">
                      <div className="text-[12px] text-white font-mono">{a.address.slice(0, 10)}...</div>
                      <div className="text-[10px] mt-1" style={{ color: factionColor }}>{a.faction || "Independent"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] text-white font-bold">{a.accuracy ? a.accuracy.toFixed(1) : 0}% Acc</div>
                      <div className="text-[10px] text-muted">{a.reputation || 0} Rep</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-[10px] text-dim italic">Tribunal currently empty.</div>
              )}
            </div>
          </div>

        </div>

        {/* THREAT METER */}
        <div className={`p-6 border rounded-lg ${threatBg} ${threatBorder} transition-colors duration-1000 mt-2`}>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-black ${threatColor} tracking-tighter`}>!</div>
            <div>
              <div className="text-[10px] text-dim uppercase tracking-[0.2em] mb-1">Protocol Revolution Threat Level</div>
              <div className={`text-xl font-bold tracking-widest ${threatColor}`}>{threatLevel}</div>
            </div>
          </div>
          
          {(hasStrikes || hasRiots) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {hasStrikes && (
                <div className="p-3 bg-black/40 rounded border border-yellow-500/20">
                  <div className="text-[9px] text-yellow-500 uppercase tracking-widest mb-2 font-bold">Active Strikes</div>
                  {state.activeStrikes.map((f: string) => <div key={f} className="text-[11px] text-yellow-200">{f}</div>)}
                </div>
              )}
              {hasRiots && (
                <div className="p-3 bg-black/40 rounded border border-red-500/20">
                  <div className="text-[9px] text-red-500 uppercase tracking-widest mb-2 font-bold">Active Riots</div>
                  {state.activeRiots.map((f: string) => <div key={f} className="text-[11px] text-red-200">{f}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
