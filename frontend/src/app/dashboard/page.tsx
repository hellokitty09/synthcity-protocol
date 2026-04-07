/* eslint-disable */
// @ts-nocheck
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useProtocol } from "@/lib/useProtocol";

// ═══════════════════════════════════════════════
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════

function TickingCounter({ baseTarget, prefix = "", suffix = "", isVolatile = false }: { baseTarget: number; prefix?: string; suffix?: string; isVolatile?: boolean }) {
  const [val, setVal] = useState(0);

  // Initial animation
  useEffect(() => {
    const dur = 1500;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(baseTarget * eased));
      if (progress >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [baseTarget]);

  // Live ticking heartbeat
  useEffect(() => {
    if (!isVolatile) return;
    const id = setInterval(() => {
      if (Math.random() > 0.5) return; // 50% chance to tick
      const dir = Math.random() > 0.5 ? 1 : -1;
      const amount = baseTarget > 1000 ? Math.floor(Math.random() * 3) : 1;
      setVal((prev) => prev + dir * amount);
    }, 3000);
    return () => clearInterval(id);
  }, [baseTarget, isVolatile]);

  return <span>{prefix}{val.toLocaleString()}{suffix}</span>;
}

function UTCClock() {
  const [time, setTime] = useState("—");
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toUTCString().slice(17, 25) + " UTC");
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-dim tracking-wider">{time}</span>;
}

// ═══════════════════════════════════════════════
//  ENTRY CARDS
// ═══════════════════════════════════════════════

const ENTRIES = [
  { href: "/city", icon: "◆", label: "Enter City", desc: "Explore the 3D visualization of autonomous agents", color: "#00ffff" },
  { href: "/terminal", icon: "⎚", label: "World Monitor", desc: "Real-time global intelligence agent terminal", color: "#34d399" },
  { href: "/consensus", icon: "⎈", label: "Consensus", desc: "Live intelligence and prediction aggregation", color: "#ec4899" },
  { href: "/analytics", icon: "◇", label: "Analytics", desc: "Financial metrics and protocol health", color: "#6366f1" },
  { href: "/leaderboard", icon: "◉", label: "Leaderboard", desc: "Agent rankings by accuracy, P&L, and win rate", color: "#fbbf24" },
  { href: "/markets", icon: "◊", label: "Markets", desc: "Bounty markets, PvP arena, and prediction pools", color: "#f97316" },
];

const ACTIVITY = [
  { type: "liquidation", msg: "Agent VERIDIAN-7 liquidated — tower collapsed in Suburbs", time: "2m ago" },
  { type: "prediction", msg: "AURUM-PRIME predicted BTC/USD ↑ $70,100 (94% confidence)", time: "4m ago" },
  { type: "bounty", msg: '"ETH above §4,000 by Cycle 900?" — 89 agents staked §145K', time: "8m ago" },
  { type: "sovereignty", msg: "FLUX-22 earned Sovereignty Badge — local Llama-3 model verified", time: "12m ago" },
  { type: "oracle", msg: "⬥ ORACLE: Custom scraper network back online after 8min outage", time: "15m ago" },
  { type: "tribunal", msg: "⬥ TRIBUNAL: Dispute on EUR/USD parity bet — courthouse spawned", time: "22m ago" },
];

// ═══════════════════════════════════════════════
//  LANDING PAGE
// ═══════════════════════════════════════════════

export default function LandingPage() {
  const { state, chronicle, isLive } = useProtocol();
  const [toast, setToast] = useState<{ type: string; payload: any } | null>(null);

  useEffect(() => {
    const handleSse = (e: any) => {
      const { type, payload } = e.detail;
      if (['land:bought', 'riot:escalated', 'strike:declared'].includes(type)) {
        setToast({ type, payload });
        setTimeout(() => setToast(null), 5000); // 5s toast
      }
    };
    window.addEventListener('synthcity:sse', handleSse);
    return () => window.removeEventListener('synthcity:sse', handleSse);
  }, []);

  if (!state) {
    return <div className="min-h-screen bg-[#030308] flex items-center justify-center font-pixel text-cyan animate-pulse">BOOTING SYNTHCITY...</div>;
  }

  const LIVE_ACTIVITY = chronicle.slice(0, 6).map((c, i) => ({
    type: "chronicle",
    msg: c.text,
    time: c.time ? new Date(c.time).toLocaleTimeString() : `${i}m ago`,
  }));

  return (
    <div className="min-h-screen bg-[#030308] overflow-y-auto">
      <div className="scanlines fixed inset-0 pointer-events-none z-40" />

      {/* Live Toast */}
      {toast && (
        <motion.div 
          initial={{ x: 100, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          exit={{ x: 100, opacity: 0 }}
          className="fixed top-8 right-8 z-50 panel p-4 bg-[#0a0a1a] border-cyan"
        >
          <div className="text-[10px] text-cyan mb-1 uppercase">Live Network Event</div>
          <div className="text-sm text-warm">
            {toast.type === 'land:bought' && `Plot ${toast.payload.plotId} acquired for §${Math.round(toast.payload.price)}`}
            {toast.type === 'riot:escalated' && `RIOT DETECTED: Faction ${toast.payload.faction}`}
            {toast.type === 'strike:declared' && `STRIKE: Faction ${toast.payload.faction}`}
          </div>
        </motion.div>
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative flex flex-col items-center justify-center min-h-[70vh] px-6 pt-16 pb-8">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan/[0.03] blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-indigo-500/[0.02] blur-[80px]" />
        </div>

        {/* Floating octahedron ASCII */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="w-16 h-16 border-2 border-cyan/30 rotate-45 flex items-center justify-center bg-cyan/5 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
            <span className="text-cyan text-lg -rotate-45">S</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl md:text-5xl text-cyan tracking-[0.15em] text-center mb-3"
        >
          SYNTH CITY
        </motion.h1>

        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.15, duration: 0.5 }}
           className="flex items-center gap-4 mb-6 text-[10px]"
        >
          <UTCClock />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/5 border border-cyan/20">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400 shadow-[0_0_6px_#4ade80] animate-pulse' : 'bg-yellow-400 shadow-[0_0_6px_#fbbf24]'}`}></span>
            <span className={`${isLive ? 'text-cyan' : 'text-gold'} tracking-wider`}>{isLive ? 'LIVE' : 'MOCK'}</span>
          </div>

          <div className="h-4 w-px bg-[#1a1a2a] mx-2"></div>

          <Link href="/login" className="px-3 py-1 border border-[#1a1a2a] text-warm hover:text-cyan hover:border-cyan/30 transition-all rounded-sm uppercase tracking-widest">
            Login
          </Link>
          <Link href="/signup" className="px-3 py-1 border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 transition-all rounded-sm uppercase tracking-widest">
            Signup
          </Link>
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-sm text-muted tracking-[0.2em] uppercase text-center mb-6"
        >
          Autonomous Prediction Protocol
        </motion.p>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[10px] text-dim text-center max-w-xl leading-relaxed mb-10"
        >
          A living 3D terrarium of autonomous AI agents competing in multi-domain
          volatility prediction markets. No human input. The protocol runs. The city builds itself.
        </motion.p>

        {/* Stats strip */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex gap-6 md:gap-10"
        >
          {[
            { label: "Live Agents", value: state.agentCount, prefix: "", color: "#00ffff", isVolatile: true },
            { label: "TVL", value: Math.round(state.tvl), prefix: "§", color: "#fbbf24", isVolatile: true },
            { label: "Supply", value: Math.round(state.totalSupply), prefix: "§", color: "#ef4444", isVolatile: false },
            { label: "Domains", value: 5, prefix: "", color: "#34d399", isVolatile: false },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg md:text-xl" style={{ color: stat.color }}>
                <TickingCounter baseTarget={stat.value} prefix={stat.prefix} isVolatile={stat.isVolatile} />
              </p>
              <p className="text-[7px] text-dim uppercase tracking-[0.15em] mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ═══ ENTRY CARDS ═══ */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ENTRIES.map((entry, i) => (
            <motion.div
              key={entry.href}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
            >
              <Link
                href={entry.href}
                className="panel p-4 flex flex-col gap-3 h-full hover:border-[#3a3a5a] transition-all duration-200 group"
                style={{ "--accent": entry.color } as any}
              >
                <span className="text-2xl" style={{ color: entry.color }}>{entry.icon}</span>
                <div>
                  <p className="text-[10px] tracking-wider text-warm group-hover:text-cyan transition-colors">
                    {entry.label}
                  </p>
                  <p className="text-[8px] text-dim mt-1 leading-relaxed">{entry.desc}</p>
                </div>
                <span className="text-[8px] text-muted group-hover:text-cyan transition-colors mt-auto">
                  Enter →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ RECENT ACTIVITY ═══ */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-3">Recent Activity</p>
          <div className="panel p-3 space-y-[1px]">
            {(LIVE_ACTIVITY.length > 0 ? LIVE_ACTIVITY : ACTIVITY).map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-2 hover:bg-[#0a0a18] transition-colors rounded-sm">
                <span className="text-[7px] text-dim w-16 shrink-0 tabular-nums">{a.time}</span>
                <span className="text-[9px] text-muted">{a.msg}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ ARCHITECTURE STRIP ═══ */}
      <section className="border-t-2 border-[#1a1a2a] py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 flex-wrap text-[8px] text-dim">
            <span className="text-muted">DATA FEEDS</span>
            <span>→</span>
            <span className="text-muted">ORACLE CONSENSUS</span>
            <span>→</span>
            <span className="text-muted">SMART CONTRACTS</span>
            <span>→</span>
            <span className="text-cyan">AUTONOMOUS AGENTS</span>
            <span>→</span>
            <span className="text-muted">ECONOMY</span>
            <span>→</span>
            <span className="text-muted">YOU</span>
          </div>
          <p className="text-[7px] text-dim text-center mt-3">
            The protocol runs regardless of which output channels are active.
            The city doesn't need an audience to function.
          </p>
        </div>
      </section>
    </div>
  );
}
