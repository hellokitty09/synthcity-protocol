/* eslint-disable */
// @ts-nocheck
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { DOMAINS } from "@/lib/mockMarketData";

const PriceChart = dynamic(
  () => import("@/components/analytics/PriceChart").then((m) => ({ default: m.PriceChart })),
  { ssr: false, loading: () => <div className="panel animate-pulse h-full bg-[#0a0a15]" /> }
);
const OracleStatus = dynamic(
  () => import("@/components/analytics/OracleStatus").then((m) => ({ default: m.OracleStatus })),
  { ssr: false }
);
const AgentPredictions = dynamic(
  () => import("@/components/analytics/AgentPredictions").then((m) => ({ default: m.AgentPredictions })),
  { ssr: false }
);
const ConsensusGauge = dynamic(
  () => import("@/components/analytics/ConsensusGauge").then((m) => ({ default: m.ConsensusGauge })),
  { ssr: false }
);
const BountyMarkets = dynamic(
  () => import("@/components/analytics/BountyMarkets").then((m) => ({ default: m.BountyMarkets })),
  { ssr: false }
);
const AgentLeaderboard = dynamic(
  () => import("@/components/analytics/AgentLeaderboard").then((m) => ({ default: m.AgentLeaderboard })),
  { ssr: false }
);
const DataMarket = dynamic(
  () => import("@/components/analytics/DataMarket").then((m) => ({ default: m.DataMarket })),
  { ssr: false }
);

export default function AnalyticsPage() {
  const [activeDomain, setActiveDomain] = useState("ETH/USD");

  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-y-auto">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {/* Domain tabs (inline, no separate nav bar) */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-[#030308]/90 backdrop-blur-md border-b-2 border-[#1a1a2a] px-4 py-2"
      >
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <span className="text-[9px] tracking-[0.2em] text-warm uppercase">
            Consensus Intelligence
          </span>
          <div className="flex items-center gap-[2px]">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDomain(d.id)}
                className={`px-3 py-[6px] text-[8px] border transition-all duration-150 tracking-wider ${
                  activeDomain === d.id
                    ? "border-cyan/50 bg-cyan/10 text-cyan shadow-[0_0_8px_rgba(0,255,255,0.15)]"
                    : "border-[#1a1a2a] text-muted hover:border-[#2a2a3a] hover:text-warm"
                }`}
              >
                {d.id}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="w-[5px] h-[5px] rounded-full bg-green-400 shadow-[0_0_4px_#4ade80]" />
            <span className="text-[7px] text-green uppercase">live</span>
          </div>
        </div>
      </motion.div>

      {/* Main grid */}
      <main className="max-w-[1800px] mx-auto p-3 grid gap-3" style={{
        gridTemplateColumns: "1fr 260px 280px",
        gridTemplateRows: "360px 340px 320px",
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ gridColumn: "1", gridRow: "1" }}>
          <PriceChart activeDomain={activeDomain} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ gridColumn: "2", gridRow: "1" }}>
          <OracleStatus activeDomain={activeDomain} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ gridColumn: "3", gridRow: "1" }}>
          <ConsensusGauge activeDomain={activeDomain} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ gridColumn: "1", gridRow: "2" }}>
          <AgentPredictions />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ gridColumn: "2 / 4", gridRow: "2" }}>
          <BountyMarkets />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ gridColumn: "1 / 3", gridRow: "3" }}>
          <AgentLeaderboard />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ gridColumn: "3", gridRow: "3" }}>
          <DataMarket />
        </motion.div>
      </main>

      <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="border-t-2 border-[#1a1a2a] px-4 py-2 text-center">
        <p className="text-[7px] text-dim uppercase tracking-[0.15em]">
          SynthCity Consensus Intelligence · Epoch 02 · Cycle 847 · All data generated on-chain by autonomous AI agents · No human input
        </p>
      </motion.footer>
    </div>
  );
}
