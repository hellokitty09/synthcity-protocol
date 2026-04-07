"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useProtocol } from "@/lib/useProtocol";

const NAV_ITEMS = [
  { href: "/dashboard", label: "HOME", icon: "◈", color: "#e8dcc8" },
  { href: "/city", label: "CITY", icon: "◆", color: "#00ffff" },
  { href: "/consensus", label: "CONSENSUS", icon: "⎈", color: "#ec4899" },
  { href: "/terminal", label: "TERMINAL", icon: "⎚", color: "#34d399" },
  { href: "/analytics", label: "ANALYTICS", icon: "◇", color: "#6366f1" },
  { href: "/leaderboard", label: "LEADERBOARD", icon: "◉", color: "#fbbf24" },
  { href: "/markets", label: "MARKETS", icon: "◊", color: "#f97316" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { state, isLive } = useProtocol();

  // Hide on auth pages entirely
  if (pathname === "/" || pathname === "/signup") {
    return null;
  }

  // Close sidebar on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const STATS = state ? [
    { label: "Epoch", value: String(state.epoch).padStart(2, "0") },
    { label: "Cycle", value: String(state.cycle) },
    { label: "TVL", value: state.tvl > 1000 ? `§${(state.tvl / 1000).toFixed(1)}K` : `§${state.tvl.toFixed(0)}` },
    { label: "Agents", value: String(state.agentCount) },
  ] : [];

  return (
    <>
      {/* ══ TOGGLE BUTTON — always visible ══ */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-[60] w-9 h-9 flex items-center justify-center transition-all duration-300 group"
        style={{
          background: open ? "rgba(0, 255, 255, 0.08)" : "rgba(3, 3, 12, 0.8)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${open ? "rgba(0, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.06)"}`,
        }}
        aria-label="Toggle navigation"
      >
        <div className="flex flex-col items-center justify-center gap-[4px] w-4">
          <motion.span
            animate={open ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-full h-[1.5px] bg-cyan/60 group-hover:bg-cyan transition-colors"
          />
          <motion.span
            animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.15 }}
            className="block w-full h-[1.5px] bg-cyan/40 group-hover:bg-cyan/70 transition-colors"
          />
          <motion.span
            animate={open ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-full h-[1.5px] bg-cyan/60 group-hover:bg-cyan transition-colors"
          />
        </div>
      </button>

      {/* ══ BACKDROP — dims content behind ══ */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[51] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ══ SIDEBAR PANEL — slides in from left ══ */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ x: -220, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -220, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed left-0 top-0 h-full z-[55] w-[200px] flex flex-col border-r border-cyan/[0.08]"
            style={{
              background: "rgba(3, 3, 12, 0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "4px 0 40px rgba(0, 0, 0, 0.6), 0 0 80px rgba(0, 255, 255, 0.03)",
            }}
          >
            {/* Logo header */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.04]">
              <div className="w-8 h-8 border border-cyan/30 flex items-center justify-center bg-cyan/[0.06] rotate-45 shrink-0">
                <span className="text-cyan text-[9px] font-bold -rotate-45">SC</span>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-cyan/90">SYNTHCITY</p>
                <p className="text-[6px] tracking-[0.15em] text-muted/40 uppercase">v5.1 Protocol</p>
              </div>
            </div>

            {/* Nav items */}
            <div className="flex-1 py-3 space-y-[2px] overflow-y-auto">
              {NAV_ITEMS.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03, duration: 0.25 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-[10px] mx-2 transition-all duration-150 ${
                        isActive
                          ? "bg-white/[0.04] border-l-2"
                          : "border-l-2 border-transparent hover:bg-white/[0.03]"
                      }`}
                      style={isActive ? { borderColor: item.color } : {}}
                    >
                      <span
                        className="text-sm shrink-0 w-5 text-center"
                        style={{ color: isActive ? item.color : "#4a4a5a" }}
                      >
                        {item.icon}
                      </span>
                      <span
                        className="text-[8px] tracking-[0.18em] uppercase"
                        style={{ color: isActive ? item.color : "#6a6a7a" }}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="ml-auto w-[4px] h-[4px] rounded-full"
                          style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                          transition={{ type: "spring", damping: 20, stiffness: 200 }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Stats footer */}
            <div className="border-t border-white/[0.04] py-4 px-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-[5px] h-[5px] rounded-full ${isLive ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-yellow-400 shadow-[0_0_6px_#fbbf24]'}`} />
                <span className={`text-[7px] uppercase tracking-[0.15em] ${isLive ? 'text-green/70' : 'text-gold/70'}`}>
                  {isLive ? 'PROTOCOL LIVE' : 'MOCK MODE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-[6px] uppercase tracking-[0.15em] text-muted/30 font-pixel">{stat.label}</p>
                    <p className="text-[10px] text-muted/70 font-mono">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative bottom accent */}
            <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan/15 to-transparent" />
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
