/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { generateLeaderboard, DOMAINS } from "@/lib/mockMarketData";
import type { LeaderboardAgent } from "@/lib/mockMarketData";

const TYPE_COLORS: Record<string, string> = {
  macro: "#00ffff",
  supply_chain: "#f97316",
  geopolitical: "#6366f1",
  sentiment: "#ff6eb4",
};

const TYPE_LABELS: Record<string, string> = {
  macro: "MACRO",
  supply_chain: "SUPPLY",
  geopolitical: "GEO",
  sentiment: "SENT",
};

const RANK_COLORS = ["#fbbf24", "#c0c0c0", "#cd7f32"];

export function AgentLeaderboard() {
  const agents = useMemo(() => generateLeaderboard(), []);
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = filter === "ALL"
    ? agents
    : agents.filter((a) => a.activeDomains.includes(filter));

  return (
    <div className="panel panel-glow p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted">Agent Leaderboard</p>
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-dim">{filtered.length} agents</span>
        </div>
      </div>

      {/* Domain filter */}
      <div className="flex gap-1 mb-3 pb-2 border-b border-[#1a1a2a] flex-wrap">
        <button
          onClick={() => setFilter("ALL")}
          className={`text-[7px] px-2 py-[2px] border transition-colors ${
            filter === "ALL" ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-[#1a1a2a] text-dim hover:text-muted"
          }`}
        >
          ALL
        </button>
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => setFilter(d.id)}
            className={`text-[7px] px-2 py-[2px] border transition-colors ${
              filter === d.id ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-[#1a1a2a] text-dim hover:text-muted"
            }`}
          >
            {d.id}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center text-[7px] text-dim uppercase px-2 mb-1 gap-2">
        <span className="w-4">#</span>
        <span className="flex-1">Agent</span>
        <span className="w-10 text-right">Type</span>
        <span className="w-12 text-right">Acc</span>
        <span className="w-16 text-right">P&L</span>
        <span className="w-10 text-right">Win%</span>
      </div>

      {/* Agents list */}
      <div className="flex-1 overflow-y-auto space-y-[4px] scrollbar-hide">
        {filtered.map((agent, i) => {
          const typeColor = TYPE_COLORS[agent.type] || "#64748b";
          return (
            <div
              key={agent.address}
              className="flex items-center px-2 py-[6px] bg-[#0a0a15] border border-[#1a1a2a] hover:border-[#2a2a3a] transition-colors gap-2"
            >
              <span
                className="w-4 text-[9px] font-bold"
                style={{ color: RANK_COLORS[agent.rank - 1] || "#64748b" }}
              >
                {agent.rank}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-muted truncate">{agent.address}</span>
                  {agent.isSovereign && (
                    <span className="text-[6px] px-[3px] py-[0.5px] border border-cyan/30 bg-cyan/10 text-cyan uppercase">
                      sov
                    </span>
                  )}
                </div>
                <p className="text-[7px] text-dim truncate">{agent.model}</p>
              </div>

              <span
                className="w-10 text-right text-[7px] uppercase"
                style={{ color: typeColor }}
              >
                {TYPE_LABELS[agent.type]}
              </span>

              <span className="w-12 text-right text-[9px] text-cyan">{agent.accuracy}%</span>

              <span className={`w-16 text-right text-[8px] ${agent.totalPnl >= 0 ? "text-green" : "text-red"}`}>
                {agent.totalPnl >= 0 ? "+" : ""}§{(agent.totalPnl / 1000).toFixed(1)}K
              </span>

              <span className="w-10 text-right text-[8px] text-dim">{agent.winRate}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
