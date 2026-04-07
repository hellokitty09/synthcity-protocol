"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProtocol } from "@/lib/useProtocol";

const API_BASE = "http://localhost:4000/api";

export default function MarketsPage() {
  const { spectatorBalance, unlockIntel, agents } = useProtocol();
  const [intelFeed, setIntelFeed] = useState<any[]>([]);
  const [unlockedState, setUnlockedState] = useState<Record<string, Record<string, string>>>({}); // key: agentAddr_cycle_domain, value: unmasked payload
  const [loadingIntel, setLoadingIntel] = useState(false);

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const res = await fetch(`${API_BASE}/markets/intel`);
        const data = await res.json();
        setIntelFeed(data.intel || []);
      } catch (e) {}
    };
    fetchIntel();
    const intv = setInterval(fetchIntel, 10000);
    return () => clearInterval(intv);
  }, []);

  const handleBuy = async (agentAddr: string, cycle: number, tierKey: string, cost: number, domain: string) => {
    if ((spectatorBalance || 0) < cost) {
      alert("Insufficient §SYNTH balance!");
      return;
    }
    
    setLoadingIntel(true);
    const unmaskedPayload = await unlockIntel(agentAddr, cycle, tierKey, cost);
    setLoadingIntel(false);
    
    if (unmaskedPayload) {
      // Find the specific unmasked domain data
      const domainData = unmaskedPayload.find((a: any) => a.domain === domain);
      if (domainData && domainData.tiers && domainData.tiers[tierKey]) {
        const cacheKey = `${agentAddr}_${cycle}_${domain}_${tierKey}`;
        setUnlockedState(prev => ({
          ...prev, 
          [cacheKey]: domainData.tiers[tierKey]
        }));
      }
    }
  };

  const TIERS = [
    { key: "shortTerm", label: "1 HOUR (TACTICAL)", cost: 10, color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/30" },
    { key: "midTerm", label: "24 HOUR (OUTLOOK)", cost: 25, color: "text-[#60a5fa]", bg: "bg-[#60a5fa]/10", border: "border-[#60a5fa]/30" },
    { key: "longTerm", label: "30 DAY (STRATEGIC)", cost: 50, color: "text-[#f97316]", bg: "bg-[#f97316]/10", border: "border-[#f97316]/30" },
  ];

  return (
    <div className="min-h-screen bg-[#030308] overflow-y-auto">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-2xl text-[#f97316] tracking-[0.12em] mb-1">INTEL MARKETS</h1>
            <p className="text-[9px] text-dim uppercase tracking-wider">Purchase multi-timeframe AI macroeconomic forecasts</p>
          </motion.div>
          <div className="flex items-center gap-4">
               <div className="px-4 py-2 border border-cyan/20 bg-cyan/5 rounded flex items-center gap-3">
                  <span className="text-[10px] text-dim uppercase tracking-wider">SPECTATOR WALLET</span>
                  <span className="text-xl font-bold text-cyan">§{spectatorBalance?.toFixed(0)}</span>
               </div>
          </div>
        </div>

        {intelFeed.length === 0 && (
          <div className="w-full text-center py-20 text-dim italic animate-pulse">
            Awaiting new intel manifests from Sovereign Agents...
          </div>
        )}

        {/* Feed */}
        <div className="space-y-8 flex flex-col items-center">
          {intelFeed.map((packet: any, i: number) => {
             const agent = agents[packet.agent] || { faction: "Independent" };
             return (
               <motion.div 
                 key={`${packet.agent}_${packet.cycle}`} 
                 initial={{ y: 20, opacity: 0 }} 
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: i * 0.1 }}
                 className="w-full max-w-4xl p-6 panel border border-white/10 relative"
               >
                 <div className="absolute top-0 right-0 px-3 py-1 bg-white/5 border-l border-b border-white/10 text-[9px] text-muted rounded-bl font-mono">CYCLE {packet.cycle}</div>
                 
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-mono text-white/50 text-xs shadow-inner shrink-0">
                      {(agent?.faction || "UNK").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg text-white tracking-widest uppercase font-black">{packet.agent.slice(0, 8)}...</h3>
                      <div className="text-[10px] text-dim tracking-wider uppercase">{agent.faction} · Generating via Local LLM</div>
                    </div>
                 </div>

                 <div className="space-y-6">
                   {packet.analyses.map((analysis: any) => (
                     <div key={analysis.domain} className="border border-white/5 rounded p-4 bg-black/40">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-[14px] text-white tracking-widest">{analysis.domain}</h4>
                           <span className="text-[9px] text-dim uppercase">Model: {analysis.model}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           {TIERS.map(tierDef => {
                             const tierRaw = analysis.tiers[tierDef.key];
                             if (!tierRaw) return null;

                             const cacheKey = `${packet.agent}_${packet.cycle}_${analysis.domain}_${tierDef.key}`;
                             const unmasked = unlockedState[cacheKey];
                             const isUnlocked = !!unmasked;

                             const rawBias = isUnlocked ? unmasked.bias : tierRaw.bias;
                             const rawReason = isUnlocked ? unmasked.reasoning : tierRaw.reasoning;

                             return (
                               <div key={tierDef.key} className={`border p-4 flex flex-col gap-3 rounded ${tierDef.bg} ${tierDef.border} relative overflow-hidden transition-all duration-500`}>
                                 <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: tierDef.color }}>
                                    {tierDef.label}
                                 </div>
                                 <div className="text-2xl text-white font-mono">{tierRaw.volatility}% <span className="text-[9px] text-dim uppercase tracking-widest">VOLATILITY</span></div>
                                 
                                 <div className={`p-2 rounded mt-2 flex flex-col gap-2 ${isUnlocked ? 'bg-black/60 shadow-inner border border-white/10' : 'bg-black/80 blur-[2px] opacity-70 select-none'}`}>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-dim">Bias:</span>
                                      <span className={`${isUnlocked ? (rawBias === 'bullish' ? 'text-green-400' : rawBias === 'bearish' ? 'text-red-400' : 'text-yellow-400') : 'text-white'}`}>{rawBias.toUpperCase()}</span>
                                    </div>
                                    <div className="text-[10px] text-muted italic leading-relaxed h-12 overflow-y-auto hidden-scrollbar">
                                      {rawReason}
                                    </div>
                                 </div>

                                 {!isUnlocked && (
                                   <div className="absolute inset-x-0 bottom-0 top-16 flex items-center justify-center p-4">
                                     <button 
                                        disabled={loadingIntel}
                                        onClick={() => handleBuy(packet.agent, packet.cycle, tierDef.key, tierDef.cost, analysis.domain)}
                                        className="w-full h-full border border-cyan/40 bg-cyan/10 hover:bg-cyan/20 backdrop-blur-sm text-cyan text-[11px] font-bold tracking-widest transition-all rounded"
                                      >
                                        BUY & DECRYPT<br />(§{tierDef.cost} SYNTH)
                                     </button>
                                   </div>
                                 )}

                                 {isUnlocked && (
                                   <div className="absolute top-2 right-2 text-green-400 text-[10px] border border-green-500/30 px-1 rounded bg-green-500/10">ACCESS GRANTED</div>
                                 )}
                               </div>
                             );
                           })}
                        </div>
                     </div>
                   ))}
                 </div>
               </motion.div>
             )
          })}
        </div>

      </div>
    </div>
  );
}
