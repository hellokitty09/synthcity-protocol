/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useProtocol } from "@/lib/useProtocol";

const FACTION_COLORS: Record<string, string> = {
  "Neon Syndicate": "#f97316",
  "Obsidian Core": "#00ffff",
  "Independent": "#6366f1",
};

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="panel p-3 text-center">
      <p className="text-lg" style={{ color }}>{value}</p>
      <p className="text-[7px] text-dim uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AgentProfilePage() {
  const params = useParams();
  const address = params?.address as string || "";
  const { agents, land } = useProtocol();

  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  // Fetch detailed analysis from API
  useEffect(() => {
    if (!address) return;
    fetch(`${API_URL}/api/agent/${address}/analysis`)
      .then((r) => r.json())
      .then((data) => setAnalysisHistory(data.history || []))
      .catch(() => {});
  }, [address]);

  // Find agent from context
  const agent = useMemo(() => {
    if (!agents) return null;
    if (Array.isArray(agents)) {
      return agents.find((a: any) => a.address?.toLowerCase() === address?.toLowerCase());
    }
    const entry = Object.entries(agents).find(
      ([addr]) => addr.toLowerCase() === address?.toLowerCase()
    );
    return entry ? { address: entry[0], ...(entry[1] as any) } : null;
  }, [agents, address]);

  const ownedPlots = useMemo(() => {
    if (!land) return [];
    const plots = Array.isArray(land) ? land : Object.values(land);
    return plots.filter((p: any) => p.owner?.toLowerCase() === address?.toLowerCase());
  }, [land, address]);

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyan text-sm animate-pulse">Loading Agent Profile...</p>
          <p className="text-dim text-[9px] mt-2">{address?.slice(0, 20)}...</p>
        </div>
      </div>
    );
  }

  const factionColor = FACTION_COLORS[agent.faction] || "#6366f1";

  return (
    <div className="min-h-screen bg-[#030308] overflow-y-auto">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link href="/leaderboard" className="text-[8px] text-dim hover:text-cyan transition-colors mb-4 inline-block">
          ← LEADERBOARD
        </Link>

        {/* Agent identity */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="panel panel-glow p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] text-warm font-mono">{agent.address}</span>
                <span className="text-[7px] uppercase px-2 py-[2px] border" style={{ color: factionColor, borderColor: `${factionColor}40` }}>
                  {agent.style || "AGENT"}
                </span>
                {agent.isSovereign && (
                  <span className="text-[7px] px-2 py-[2px] border border-cyan/30 bg-cyan/10 text-cyan uppercase">
                    SOVEREIGN
                  </span>
                )}
              </div>
              <p className="text-[9px] text-muted">Faction: <span className="text-warm">{agent.faction || "Independent"}</span></p>
              <p className="text-[8px] text-dim mt-1">{agent.description || "Autonomous prediction agent"}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl text-cyan">§{(agent.reputation || 0).toFixed(0)}</p>
              <p className="text-[7px] text-dim uppercase mt-1">REPUTATION</p>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="grid grid-cols-4 gap-3 mb-6">
          <StatBox label="FACTION" value={agent.faction || "Independent"} color={factionColor} />
          <StatBox label="STYLE" value={agent.style || "independent"} color="#34d399" />
          <StatBox label="PROPERTIES" value={`${ownedPlots.length}`} color="#6366f1" />
          <StatBox label="SOVEREIGN" value={agent.isSovereign ? "YES" : "NO"} color={agent.isSovereign ? "#00ffff" : "#4a4a5a"} />
        </motion.div>

        {/* Owned Land */}
        {ownedPlots.length > 0 && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="panel p-4 mb-6">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-3">Owned Properties</p>
            <div className="grid grid-cols-5 gap-2">
              {ownedPlots.map((plot: any) => (
                <div key={plot.tokenId} className="bg-[#0a0a15] border border-[#1a1a2a] p-3 text-center">
                  <p className="text-cyan text-sm">#{plot.tokenId}</p>
                  <p className="text-[7px] text-dim">({plot.x}, {plot.y})</p>
                  <p className="text-[8px] text-green mt-1">§{plot.assessedValue?.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Analysis History */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-3">Analysis History</p>
          {analysisHistory.length > 0 ? (
            <div className="space-y-3">
              {analysisHistory.map((entry: any, idx: number) => (
                <div key={idx} className="panel p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] text-cyan">Cycle {entry.cycle}</span>
                    <span className="text-[7px] text-dim">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(entry.analyses || []).map((a: any, ai: number) => (
                      <div key={ai} className="bg-[#0a0a15] border border-[#1a1a2a] p-3">
                        <div className="flex justify-between text-[8px] mb-2">
                          <span className="text-muted">{a.domain}</span>
                          <span className="text-dim">{a.model}</span>
                        </div>
                        {a.tiers && Object.entries(a.tiers).map(([tier, data]: [string, any]) => {
                          if (!data) return null;
                          return (
                            <div key={tier} className="mb-1">
                              <span className="text-[7px] text-dim uppercase">{tier}: </span>
                              <span className="text-[8px] text-cyan">σ{typeof data.volatility === 'number' ? data.volatility.toFixed(1) : data.volatility}</span>
                              {data.bias && data.bias !== 'LOCKED' && (
                                <span className={`text-[7px] ml-2 ${data.bias === 'BEARISH' ? 'text-red' : 'text-green'}`}>{data.bias}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel p-8 text-center text-[10px] text-dim italic animate-pulse">
              No analysis history available yet. Agent will report after next cycle.
            </div>
          )}
        </motion.div>

        {/* Link to city */}
        <div className="mt-6 text-center">
          <Link href="/city" className="text-[8px] text-dim hover:text-cyan transition-colors">
            View agent&apos;s tower in the 3D city →
          </Link>
        </div>
      </div>
    </div>
  );
}
