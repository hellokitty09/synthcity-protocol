/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo } from "react";
import { generateBountyMarkets, generatePvPBets } from "@/lib/mockMarketData";

function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff < 0) return "EXPIRED";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active: { bg: "border-green-500/30 bg-green-500/5", text: "text-green" },
  resolved: { bg: "border-cyan/30 bg-cyan/5", text: "text-cyan" },
  disputed: { bg: "border-red-500/30 bg-red-500/5", text: "text-red" },
  locked: { bg: "border-yellow-500/30 bg-yellow-500/5", text: "text-[#fbbf24]" },
  settled: { bg: "border-cyan/30 bg-cyan/5", text: "text-cyan" },
};

export function BountyMarkets() {
  const bounties = useMemo(() => generateBountyMarkets(), []);
  const pvpBets = useMemo(() => generatePvPBets(), []);

  return (
    <div className="panel panel-glow p-3 h-full flex flex-col">
      {/* ── Bounty Markets ── */}
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-3">Bounty Markets</p>

      <div className="space-y-[6px] mb-4 flex-1 overflow-y-auto scrollbar-hide">
        {bounties.map((b) => {
          const styles = STATUS_BADGE[b.status];
          return (
            <div key={b.id} className="p-2 bg-[#0a0a15] border border-[#1a1a2a]">
              <div className="flex items-start justify-between mb-1">
                <p className="text-[9px] text-warm flex-1 pr-2">{b.question}</p>
                <span
                  className={`text-[7px] uppercase px-[6px] py-[1px] border ${styles.bg} ${styles.text} shrink-0`}
                >
                  {b.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[8px] mb-1">
                <span className="text-dim">{b.domain}</span>
                <span className="text-muted">§{(b.totalStaked / 1000).toFixed(0)}K staked</span>
                <span className="text-dim">{b.participants} agents</span>
              </div>

              {/* Bull/Bear bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[4px] bg-[#1a1a2a] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500/60 to-green-400/80"
                    style={{ width: `${b.bullPercent}%` }}
                  />
                </div>
                <span className="text-[7px] text-green w-8 text-right">{b.bullPercent}%</span>
              </div>

              {b.status === "active" && (
                <p className="text-[7px] text-dim mt-1">
                  expires: <span className="text-muted">{timeUntil(b.expiry)}</span>
                </p>
              )}
              {b.status === "disputed" && (
                <p className="text-[7px] text-red mt-1 animate-pulse">
                  ⚠ Oracle feeds diverged — courthouse materializing
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── PvP Arena ── */}
      <div className="border-t border-[#1a1a2a] pt-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-2">PvP Arena</p>
        <div className="space-y-[5px]">
          {pvpBets.map((bet) => {
            const styles = STATUS_BADGE[bet.status];
            return (
              <div key={bet.id} className="flex items-center gap-2 p-2 bg-[#0a0a15] border border-[#1a1a2a] text-[8px]">
                <span className="text-muted truncate w-20">{bet.challenger}</span>
                <span className="text-dim">vs</span>
                <span className="text-muted truncate w-20">{bet.defender}</span>
                <span className="text-dim flex-1 text-right">{bet.domain}</span>
                <span className="text-cyan">§{(bet.stakeAmount / 1000).toFixed(1)}K</span>
                <span className={`text-[7px] uppercase px-[4px] py-[1px] border ${styles.bg} ${styles.text}`}>
                  {bet.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
