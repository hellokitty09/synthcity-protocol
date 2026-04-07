/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo } from "react";
import { generateOracleFeeds } from "@/lib/mockMarketData";
import type { OracleFeed } from "@/lib/mockMarketData";

const STATUS_STYLES: Record<OracleFeed["status"], { dot: string; text: string; bg: string }> = {
  live: { dot: "bg-green-400 shadow-[0_0_6px_#4ade80]", text: "text-green", bg: "border-green-900/30" },
  degraded: { dot: "bg-yellow-400 shadow-[0_0_6px_#facc15]", text: "text-[#facc15]", bg: "border-yellow-900/30" },
  offline: { dot: "bg-red-400 shadow-[0_0_6px_#f87171]", text: "text-red", bg: "border-red-900/30" },
};

const PROVIDER_COLORS: Record<string, string> = {
  chainlink: "#375bd2",
  pyth: "#8b5cf6",
  scraper: "#f97316",
};

interface OracleStatusProps {
  activeDomain: string;
}

export function OracleStatus({ activeDomain }: OracleStatusProps) {
  const feeds = useMemo(() => generateOracleFeeds(activeDomain), [activeDomain]);

  // Check divergence threshold (0.1% = dispute trigger)
  const maxDivergence = Math.max(...feeds.map((f) => f.divergence));
  const isDisputed = maxDivergence > 0.1;

  // Consensus price (average of live feeds)
  const liveFeeds = feeds.filter((f) => f.status !== "offline");
  const consensusPrice = liveFeeds.length
    ? liveFeeds.reduce((s, f) => s + f.lastPrice, 0) / liveFeeds.length
    : 0;

  return (
    <div className="panel panel-glow p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted">Oracle Consensus</p>
        {isDisputed ? (
          <span className="text-[8px] uppercase px-2 py-[2px] border border-red-500/40 text-red animate-pulse">
            ⚠ DISPUTE
          </span>
        ) : (
          <span className="text-[8px] uppercase px-2 py-[2px] border border-green-500/30 text-green">
            ✓ AGREED
          </span>
        )}
      </div>

      {/* Consensus Price */}
      <div className="text-center mb-3 pb-3 border-b border-[#1a1a2a]">
        <p className="text-[7px] uppercase text-muted tracking-wider mb-1">consensus price</p>
        <p className="text-lg text-cyan">
          {consensusPrice > 100
            ? consensusPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : consensusPrice.toFixed(4)}
        </p>
        <p className="text-[7px] text-muted mt-1">
          max divergence: <span className={maxDivergence > 0.1 ? "text-red" : "text-green"}>{(maxDivergence * 100).toFixed(2)}%</span>
          <span className="text-dim"> / 0.10% threshold</span>
        </p>
      </div>

      {/* Individual Feeds */}
      <div className="space-y-2 flex-1">
        {feeds.map((feed) => {
          const style = STATUS_STYLES[feed.status];
          return (
            <div key={feed.provider} className={`p-2 border ${style.bg} border-[#1a1a2a] bg-[#0a0a15]`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-[6px] h-[6px] rounded-full ${style.dot}`} />
                  <span className="text-[9px] text-warm">{feed.name}</span>
                </div>
                <span className={`text-[7px] uppercase ${style.text}`}>{feed.status}</span>
              </div>
              <div className="flex items-center justify-between text-[8px]">
                <span className="text-muted">
                  {feed.lastPrice > 100
                    ? feed.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : feed.lastPrice.toFixed(4)}
                </span>
                <span className="text-dim">{feed.latency}ms</span>
                <span className={feed.divergence > 0.1 ? "text-red" : "text-dim"}>
                  Δ{(feed.divergence * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Threshold bar */}
      <div className="mt-3 pt-2 border-t border-[#1a1a2a]">
        <div className="flex justify-between text-[7px] text-muted mb-1">
          <span>divergence</span>
          <span className={maxDivergence > 0.1 ? "text-red" : "text-green"}>
            {(maxDivergence * 100).toFixed(2)}%
          </span>
        </div>
        <div className="w-full h-[4px] bg-[#1a1a2a] rounded-sm">
          <div
            className="h-full rounded-sm transition-all duration-500"
            style={{
              width: `${Math.min(maxDivergence * 1000, 100)}%`,
              background: maxDivergence > 0.1
                ? "linear-gradient(90deg, #ef4444, #dc2626)"
                : "linear-gradient(90deg, #22c55e80, #22c55e)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
