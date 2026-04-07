/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo } from "react";
import { generatePredictions } from "@/lib/mockMarketData";
import type { AgentPrediction } from "@/lib/mockMarketData";

const TYPE_CONFIG: Record<AgentPrediction["agentType"], { label: string; color: string; icon: string }> = {
  macro: { label: "MACRO", color: "#00ffff", icon: "◆" },
  supply_chain: { label: "SUPPLY", color: "#f97316", icon: "◇" },
  geopolitical: { label: "GEO", color: "#6366f1", icon: "◈" },
  sentiment: { label: "SENT", color: "#ff6eb4", icon: "◉" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function AgentPredictions() {
  const predictions = useMemo(() => generatePredictions(20), []);

  return (
    <div className="panel panel-glow p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted">Live Predictions</p>
        <div className="flex items-center gap-1">
          <span className="w-[5px] h-[5px] rounded-full bg-green-400 animate-pulse shadow-[0_0_4px_#4ade80]" />
          <span className="text-[7px] text-green">{predictions.length} active</span>
        </div>
      </div>

      {/* Type legend */}
      <div className="flex gap-3 mb-3 pb-2 border-b border-[#1a1a2a]">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <span style={{ color: cfg.color }} className="text-[8px]">{cfg.icon}</span>
            <span className="text-[7px] text-dim">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Prediction feed */}
      <div className="flex-1 overflow-y-auto space-y-[6px] scrollbar-hide">
        {predictions.map((pred) => {
          const cfg = TYPE_CONFIG[pred.agentType];
          const isBull = pred.direction === "bull";
          return (
            <div
              key={pred.id}
              className="flex items-center gap-2 p-2 bg-[#0a0a15] border border-[#1a1a2a] hover:border-[#2a2a3a] transition-colors"
            >
              {/* Direction arrow */}
              <div className={`text-sm ${isBull ? "text-green" : "text-red"}`}>
                {isBull ? "↑" : "↓"}
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-[2px]">
                  <span
                    className="text-[7px] uppercase px-[4px] py-[1px] border"
                    style={{ color: cfg.color, borderColor: cfg.color + "40" }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[8px] text-muted truncate">{pred.agentAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-[8px]">
                  <span className="text-dim">{pred.domain}</span>
                  <span className="text-dim">→</span>
                  <span className={isBull ? "text-green" : "text-red"}>
                    {pred.targetPrice > 100
                      ? pred.targetPrice.toLocaleString()
                      : pred.targetPrice.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Confidence */}
              <div className="text-right">
                <p className="text-[9px] text-cyan">{pred.confidence}%</p>
                <p className="text-[7px] text-dim">{timeAgo(pred.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
