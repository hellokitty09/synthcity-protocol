"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { AgentInfo } from "./Megatowers";
import { useProtocol } from "@/lib/useProtocol";
import Link from "next/link";

// ═══════════════════════════════════════════════
//  MINIMAL CYCLE TIMER — top-right corner
// ═══════════════════════════════════════════════

function CycleTimer() {
  const { state } = useProtocol();
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    const tick = () => {
      if (!state || !state.cycleStartTime) return;
      const elapsed = Date.now() - state.cycleStartTime;
      const remaining = Math.max(0, Math.floor((state.cycleDurationMs - elapsed) / 1000));
      setSeconds(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state?.cycleStartTime, state?.cycleDurationMs]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const isDead = seconds < 10;

  return (
    <div className={`text-center ${isDead ? "animate-pulse" : ""}`}>
      <p className="text-[7px] uppercase tracking-[0.2em] text-muted/60 font-pixel">
        {isDead ? "settling" : "next cycle"}
      </p>
      <p className={`text-sm font-bold tracking-wider font-mono ${isDead ? "text-red" : "text-cyan/80"}`}>
        {pad(m)}:{pad(s)}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  TYPE & COLOR MAPS
// ═══════════════════════════════════════════════

const TYPE_LABELS: Record<string, string> = {
  shack: "Shack", house: "House", flat: "Flat",
  apartment: "Apartment", tower: "Tower", megatower: "Megatower",
  tribunal: "Tribunal", vault: "The Vault", enforcer: "Enforcer HQ", protocol_hq: "Protocol Core",
};

const TYPE_COLORS: Record<string, string> = {
  shack: "#475569", house: "#d97706", flat: "#2dd4bf",
  apartment: "#6366f1", tower: "#818cf8", megatower: "#00ffff",
  tribunal: "#ffffff", vault: "#fbbf24", enforcer: "#ef4444", protocol_hq: "#00ffff",
};

// ═══════════════════════════════════════════════
//  AGENT INFO PANEL — shown on building click
//  Compact slide-in from left edge
// ═══════════════════════════════════════════════

function AgentInfoPanel({ agent, onClose }: { agent: AgentInfo; onClose: () => void }) {
  const typeColor = TYPE_COLORS[agent.type] || "#e8dcc8";
  const factionColor = agent.factionColor || "#94a3b8";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 22, stiffness: 120 }}
      className="pointer-events-auto w-72 overflow-hidden relative"
      style={{
        background: "rgba(3, 3, 12, 0.88)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${factionColor}25`,
        boxShadow: `0 0 30px ${factionColor}10, inset 0 0 30px rgba(0,0,0,0.5)`,
        borderRadius: "2px",
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${factionColor}, transparent)` }}
      />

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[8px] uppercase font-bold px-[6px] py-[1px] tracking-wider border"
                style={{ color: typeColor, borderColor: typeColor + "30", background: typeColor + "08" }}
              >
                {TYPE_LABELS[agent.type]}
              </span>
              {agent.isLocalModel && (
                <span className="text-[7px] uppercase font-bold px-[5px] py-[1px] border border-pink-500/30 text-pink bg-pink-500/08">
                  sov
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono text-warm/80 tracking-wide">{agent.address}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted/40 hover:text-warm p-0.5 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {(agent.isRioting || agent.isProtesting) && (
          <div className={`mb-3 py-1.5 px-2 text-center border ${agent.isRioting ? "border-red-500/30 bg-red-500/08" : "border-gold/30 bg-gold/08"}`}>
            <p className={`text-[7px] uppercase tracking-[0.2em] font-bold ${agent.isRioting ? "text-red animate-pulse" : "text-gold"}`}>
              {agent.isRioting ? "[ RIOT ACTIVE ]" : "[ FACTION STRIKE ]"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {[
            { label: "Model", value: agent.model, color: "text-warm/70" },
            { label: "Rep", value: `${agent.reputation}/100`, color: typeColor },
            { label: "Accuracy", value: agent.accuracy, color: "text-green" },
            { label: "Stake", value: agent.stake, color: "text-cyan" },
            { label: "Faction", value: agent.faction || "Independent", color: factionColor },
            { label: "District", value: agent.district, color: "text-warm/70" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[6px] uppercase tracking-[0.15em] text-muted/40 font-pixel">{stat.label}</p>
              <p className={`text-[9px] font-medium tracking-tight`} style={{ color: typeof stat.color === 'string' && stat.color.startsWith('#') ? stat.color : undefined }}>
                <span className={typeof stat.color === 'string' && stat.color.startsWith('text-') ? stat.color : ''}>{stat.value}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
          <div>
            <p className="text-[6px] uppercase tracking-[0.15em] text-muted/40 font-pixel">Land Value</p>
            <p className="text-[10px] font-bold text-cyan">§{agent.assessedValue?.toLocaleString() || '0'}</p>
          </div>
          <div className="text-right">
            <p className="text-[6px] uppercase tracking-[0.15em] text-muted/40 font-pixel">Tax Reserve</p>
            <p className={`text-[10px] font-bold ${(agent.taxReserve || 0) > 14 ? "text-green" : (agent.taxReserve || 0) > 7 ? "text-gold" : "text-red"}`}>
              {agent.taxReserve || 0} Cycles
            </p>
          </div>
        </div>

        <div className="mt-2">
          <div className="w-full h-[3px] bg-white/[0.04] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${agent.reputation}%` }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="h-full"
              style={{ background: `linear-gradient(90deg, ${typeColor}40, ${typeColor})` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
//  CHRONICLE TICKER — bottom center, minimal
// ═══════════════════════════════════════════════

function ChronicleTicker() {
  const { chronicle } = useProtocol();
  const [index, setIndex] = useState(0);
  const entries = chronicle.length > 0 ? chronicle.map(c => c.text) : ["Waiting for protocol events..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % entries.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [entries.length]);

  const currentText = entries[index % entries.length] || "";

  return (
    <div className="pointer-events-none">
      <div
        className="overflow-hidden flex items-center gap-3 px-4 py-1.5"
        style={{
          background: "rgba(3, 3, 12, 0.7)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(0, 255, 255, 0.08)",
        }}
      >
        <span className="text-[7px] text-cyan/50 font-bold tracking-[0.15em] uppercase shrink-0 pr-3 border-r border-white/[0.04]">
          live
        </span>
        <div className="relative w-full h-[12px]">
          <AnimatePresence mode="popLayout">
            <motion.p
              key={index}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`absolute inset-0 text-[8px] tracking-wider truncate
                ${currentText.includes("riot") || currentText.includes("Riot") ? "text-gold font-bold" :
                  currentText.includes("seized") || currentText.includes("monopoly") ? "text-cyan/70" :
                  "text-muted/50"}`}
            >
              {currentText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SPECTATOR HUD — clean edge-only overlay
//  Keeps the 3D city fully visible
// ═══════════════════════════════════════════════

interface SpectatorHUDProps {
  selectedAgent?: AgentInfo | null;
  onCloseAgent?: () => void;
}

export const SpectatorHUD = ({ selectedAgent, onCloseAgent }: SpectatorHUDProps) => {
  const { state, isLive } = useProtocol();
  if (!state) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">

      {/* ══ TOP BAR — ultra-thin status strip ══ */}
      <div className="flex justify-between items-start p-3 gap-4">

        {/* Left: Logo & Protocol ID */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 pointer-events-auto"
          style={{
            background: "rgba(3, 3, 12, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0, 255, 255, 0.1)",
            padding: "8px 14px",
          }}
        >
          <div className="w-6 h-6 border border-cyan/30 flex items-center justify-center bg-cyan/[0.06] rotate-45">
            <span className="text-cyan text-[7px] font-bold -rotate-45">SC</span>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-cyan/80">SYNTHCITY</p>
            <p className="text-[6px] text-muted/40 tracking-[0.15em] uppercase">v5.1 Protocol</p>
          </div>
          <div className="w-[1px] h-5 bg-white/[0.06] mx-1" />
          <div className="flex items-center gap-1.5">
            <div className={`w-[5px] h-[5px] rounded-full ${isLive ? "bg-green shadow-[0_0_6px_var(--green)]" : "bg-gold"}`} />
            <span className={`text-[7px] font-pixel uppercase tracking-widest ${isLive ? "text-green/70" : "text-gold/70"}`}>
              {isLive ? "live" : "mock"}
            </span>
          </div>
        </motion.div>

        {/* Right: Compact stats */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 pointer-events-auto"
          style={{
            background: "rgba(3, 3, 12, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            padding: "8px 14px",
          }}
        >
          {[
            { label: "Agents", value: String(state.agentCount), color: "text-green/80" },
            { label: "Epoch", value: String(state.epoch).padStart(2, "0"), color: "text-cyan/70" },
            { label: "Cycle", value: String(state.cycle), color: "text-warm/60" },
          ].map((s, i) => (
            <div key={s.label} className={`text-center ${i > 0 ? "pl-3 border-l border-white/[0.04]" : ""}`}>
              <p className="text-[6px] uppercase tracking-[0.15em] text-muted/40 font-pixel">{s.label}</p>
              <p className={`text-[10px] font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
          <div className="pl-3 border-l border-white/[0.04]">
            <CycleTimer />
          </div>
        </motion.div>
      </div>

      {/* ══ CENTER — completely empty, city is the star ══ */}

      {/* ══ BOTTOM — agent info (only when clicked) + ticker ══ */}
      <div className="flex flex-col gap-2 p-3">

        {/* Agent panel — only appears on click */}
        <div className="flex justify-between items-end">
          <AnimatePresence mode="wait">
            {selectedAgent && (
              <AgentInfoPanel
                key="agent"
                agent={selectedAgent}
                onClose={() => onCloseAgent?.()}
              />
            )}
          </AnimatePresence>

          {/* Quick nav — small, bottom-right corner */}
          {!selectedAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="ml-auto flex gap-2 pointer-events-auto"
            >
              {[
                { href: "/terminal", label: "Terminal", icon: "⎚" },
                { href: "/leaderboard", label: "Ranks", icon: "◉" },
                { href: "/markets", label: "Markets", icon: "◊" },
              ].map((nav) => (
                <Link
                  key={nav.href}
                  href={nav.href}
                  className="text-[7px] uppercase tracking-[0.15em] text-muted/40 hover:text-cyan/70 transition-colors px-3 py-1.5 font-pixel"
                  style={{
                    background: "rgba(3, 3, 12, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <span className="mr-1.5 opacity-50">{nav.icon}</span>{nav.label}
                </Link>
              ))}
            </motion.div>
          )}
        </div>

        {/* Chronicle ticker */}
        <ChronicleTicker />
      </div>
    </div>
  );
};