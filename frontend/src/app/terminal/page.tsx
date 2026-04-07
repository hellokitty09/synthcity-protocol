"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProtocol } from "@/lib/useProtocol";

/* ═══════════════════════════════════════════════
   NATIVE TERMINAL PAGE
   Replaces the iframe with SynthCity-native panels
   showing real market data + protocol activity.
   ═══════════════════════════════════════════════ */

function formatPrice(price: number, domain: string) {
  if (domain.includes("EUR")) return price.toFixed(4);
  if (price > 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <div className="w-full h-full" />;
  const min = Math.min(...data) * 0.999;
  const max = Math.max(...data) * 1.001;
  const range = max - min || 1;
  const w = 120, h = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function PriceFeedPanel() {
  const { prices, isLive } = useProtocol();
  const [history, setHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    setHistory((prev) => {
      const next = { ...prev };
      for (const [domain, data] of Object.entries(prices)) {
        const arr = [...(prev[domain] || []), data.price];
        next[domain] = arr.slice(-20);
      }
      return next;
    });
  }, [prices]);

  const domainColors: Record<string, string> = {
    "ETH/USD": "#22d3ee",
    "BTC/USD": "#f97316",
    "SOL/USD": "#a78bfa",
    "XAU/USD": "#fbbf24",
    "EUR/USD": "#4ade80",
  };

  return (
    <div className="panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan tracking-[0.2em] uppercase font-bold">Price Feeds</span>
          <span className={`text-[8px] px-2 py-[1px] rounded-full border ${
            isLive ? "border-green-500/30 text-green bg-green-500/10" : "border-yellow-500/30 text-gold bg-yellow-500/10"
          }`}>
            {isLive ? "LIVE" : "MOCK"}
          </span>
        </div>
        <span className="text-[8px] text-dim">30s refresh</span>
      </div>

      <div className="flex-1 flex flex-col gap-[2px]">
        {Object.entries(prices).map(([domain, data]) => (
          <div key={domain} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white/[0.03] transition-colors group">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: domainColors[domain] || "#fff", boxShadow: `0 0 6px ${domainColors[domain]}` }} />
            <div className="w-[70px] shrink-0">
              <span className="text-[11px] text-warm font-medium">{domain}</span>
            </div>
            <div className="w-[100px] shrink-0 text-right">
              <span className="text-[13px] text-white font-bold tabular-nums">
                ${formatPrice(data.price, domain)}
              </span>
            </div>
            <div className="w-[60px] shrink-0 text-right">
              <span className={`text-[11px] font-medium tabular-nums ${data.change24h >= 0 ? "text-green" : "text-red"}`}>
                {data.change24h >= 0 ? "+" : ""}{data.change24h.toFixed(2)}%
              </span>
            </div>
            <div className="flex-1 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
              <MiniSparkline data={history[domain] || []} color={domainColors[domain] || "#fff"} />
            </div>
            <div className="w-[60px] shrink-0 text-right">
              <span className="text-[9px] text-muted">Vol:</span>
              <span className="text-[10px] text-warm ml-1 tabular-nums">{data.volatility.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[8px] text-dim">
        <span>Source: {Object.values(prices)[0]?.source || "—"}</span>
        <span>Updated: {Object.values(prices)[0]?.updatedAt ? new Date(Object.values(prices)[0].updatedAt!).toLocaleTimeString() : "—"}</span>
      </div>
    </div>
  );
}

function AgentActivityFeed() {
  const { chronicle, lastEvent, isLive } = useProtocol();
  const [feed, setFeed] = useState<Array<{ type: string; text: string; time: string }>>([]);

  useEffect(() => {
    if (lastEvent) {
      const eventText: Record<string, string> = {
        "agent:predicted": `Agent ${lastEvent.data.agent} submitted prediction [${lastEvent.data.faction}]`,
        "land:bought": `Plot #${lastEvent.data.plotId} seized by new owner`,
        "cycle:settled": `Cycle ${lastEvent.data.cycle} settled. Tax: ${lastEvent.data.taxRate}`,
        "agent:rewarded": `$SYNTH minted to ${lastEvent.data.agent} [${lastEvent.data.faction}]`,
        "land:foreclosed": `Plot #${lastEvent.data.plotId} FORECLOSED`,
        "price:update": `${lastEvent.data.domain} → $${lastEvent.data.price}`,
        "strike:declared": `STRIKE: ${lastEvent.data.faction} boycotts protocol`,
        "riot:escalated": `RIOT: ${lastEvent.data.faction} protests turn violent`,
      };
      const text = eventText[lastEvent.type] || lastEvent.type;
      setFeed((prev) => [{ type: lastEvent.type, text, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
    }
  }, [lastEvent]);

  // Seed from chronicle on first load
  useEffect(() => {
    if (chronicle.length > 0 && feed.length === 0) {
      setFeed(chronicle.slice(0, 10).map((c) => ({
        type: "chronicle",
        text: c.text,
        time: new Date(c.time).toLocaleTimeString(),
      })));
    }
  }, [chronicle]);

  const typeColors: Record<string, string> = {
    "agent:predicted": "#22d3ee",
    "land:bought": "#fbbf24",
    "cycle:settled": "#4ade80",
    "agent:rewarded": "#a78bfa",
    "land:foreclosed": "#f87171",
    "price:update": "#64748b",
    "strike:declared": "#f97316",
    "riot:escalated": "#ef4444",
    "chronicle": "#94a3b8",
  };

  return (
    <div className="panel p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-green tracking-[0.2em] uppercase font-bold">Agent Activity</span>
        <div className={`w-[5px] h-[5px] rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} style={{ boxShadow: isLive ? "0 0 6px #4ade80" : "none" }} />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-[1px]">
        <AnimatePresence initial={false}>
          {feed.map((entry, i) => (
            <motion.div
              key={`${entry.time}-${i}`}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 py-[6px] px-2 rounded hover:bg-white/[0.03]"
            >
              <div className="w-[3px] h-full min-h-[16px] rounded-full shrink-0 mt-1" style={{ background: typeColors[entry.type] || "#475569" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-warm/90 leading-relaxed break-words font-mono">{entry.text}</p>
              </div>
              <span className="text-[8px] text-dim shrink-0 tabular-nums">{entry.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {feed.length === 0 && (
          <div className="flex items-center justify-center h-full text-[10px] text-dim">
            Waiting for protocol events...
          </div>
        )}
      </div>
    </div>
  );
}

function DomainVolatilityMatrix() {
  const { prices, state } = useProtocol();
  if (!state) return null;

  const domains = ["ETH/USD", "BTC/USD", "SOL/USD", "XAU/USD", "EUR/USD"];

  return (
    <div className="panel p-4 h-full flex flex-col">
      <span className="text-[10px] text-pink tracking-[0.2em] uppercase font-bold mb-3">Volatility Matrix</span>

      <div className="flex-1">
        <div className="grid grid-cols-6 gap-0 text-[8px] text-dim uppercase tracking-wider mb-2 px-1">
          <span>Domain</span>
          <span className="text-right">Price</span>
          <span className="text-right">24h Δ</span>
          <span className="text-right">Vol (Ann)</span>
          <span className="text-right">Source</span>
          <span className="text-right">Status</span>
        </div>

        {domains.map((domain) => {
          const d = prices[domain];
          if (!d) return null;
          const isReal = d.source !== "mock" && d.source !== "simulated";
          return (
            <div key={domain} className="grid grid-cols-6 gap-0 py-2 px-1 border-b border-white/[0.03] text-[11px] hover:bg-white/[0.02]">
              <span className="text-warm font-medium">{domain}</span>
              <span className="text-right text-white tabular-nums">${formatPrice(d.price, domain)}</span>
              <span className={`text-right tabular-nums ${d.change24h >= 0 ? "text-green" : "text-red"}`}>
                {d.change24h >= 0 ? "+" : ""}{d.change24h.toFixed(2)}%
              </span>
              <span className="text-right text-cyan tabular-nums">{d.volatility.toFixed(1)}%</span>
              <span className="text-right text-dim text-[9px]">{d.source}</span>
              <span className="text-right">
                <span className={`inline-block w-[5px] h-[5px] rounded-full ${isReal ? "bg-green-400" : "bg-yellow-400"}`} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-3 border-t border-white/5 text-[8px] text-dim">
        Volatility = annualized standard deviation of returns. Used as oracle for cycle settlement.
      </div>
    </div>
  );
}

function ProtocolHealthPanel() {
  const { state, isLive } = useProtocol();
  const [timeLeft, setTimeLeft] = useState("—");

  if (!state) return null;

  useEffect(() => {
    const tick = () => {
      if (!state || !state.cycleStartTime) return;
      const elapsed = Date.now() - state.cycleStartTime;
      const remaining = Math.max(0, state.cycleDurationMs - elapsed);
      const s = Math.floor(remaining / 1000);
      setTimeLeft(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.cycleStartTime, state.cycleDurationMs]);

  const taxColor = state.taxRateName === "Draconian" ? "text-red" : state.taxRateName === "Severe" ? "text-gold" : "text-cyan";

  return (
    <div className="panel p-4 h-full flex flex-col">
      <span className="text-[10px] text-gold tracking-[0.2em] uppercase font-bold mb-3">Protocol Health</span>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
          <p className="text-[8px] text-dim uppercase tracking-wider mb-1">Cycle</p>
          <p className="text-lg text-white font-bold">{state.cycle}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
          <p className="text-[8px] text-dim uppercase tracking-wider mb-1">Next Settlement</p>
          <p className={`text-lg font-bold tabular-nums ${timeLeft.startsWith("0:") ? "text-red animate-pulse" : "text-cyan"}`}>{timeLeft}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
          <p className="text-[8px] text-dim uppercase tracking-wider mb-1">Epoch</p>
          <p className="text-lg text-white font-bold">{String(state.epoch).padStart(2, "0")}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
          <p className="text-[8px] text-dim uppercase tracking-wider mb-1">Tax Policy</p>
          <p className={`text-lg font-bold ${taxColor}`}>{state.taxRateName}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[8px] text-dim uppercase tracking-wider mb-1">Tribunal</p>
          <div className="flex flex-col gap-1">
            {state.tribunal.length > 0 ? state.tribunal.map((addr, i) => (
              <div key={addr} className="flex items-center gap-2 text-[10px] font-mono">
                <div className="w-[3px] h-[3px] rounded-full bg-cyan" style={{ boxShadow: "0 0 4px #22d3ee" }} />
                <span className="text-warm/80">{addr.slice(0, 10)}...</span>
                <span className="text-[7px] text-cyan/60 uppercase ml-auto">Seat {i + 1}</span>
              </div>
            )) : (
              <span className="text-[9px] text-dim italic">No tribunal elected yet</span>
            )}
          </div>
        </div>

        {state.activeStrikes.length > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2">
            <p className="text-[9px] text-gold uppercase tracking-wider font-bold">Active Strikes</p>
            {state.activeStrikes.map((f) => (
              <p key={f} className="text-[10px] text-gold/80 font-mono">{f}</p>
            ))}
          </div>
        )}

        {state.activeRiots.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 animate-pulse">
            <p className="text-[9px] text-red uppercase tracking-wider font-bold">Active Riots</p>
            {state.activeRiots.map((f) => (
              <p key={f} className="text-[10px] text-red/80 font-mono">{f}</p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-[5px] h-[5px] rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} style={{ boxShadow: isLive ? "0 0 6px #4ade80" : "0 0 6px #fbbf24" }} />
          <span className={`text-[8px] uppercase tracking-wider ${isLive ? "text-green" : "text-gold"}`}>
            {isLive ? "Connected to :4000" : "Offline — Mock Data"}
          </span>
        </div>
        <span className="text-[8px] text-dim">{state.agentCount} agents</span>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  const { state } = useProtocol();
  if (!state) return <div className="min-h-screen bg-[#030308] flex items-center justify-center font-pixel text-cyan animate-pulse">BOOTING TERMINAL...</div>;

  return (
    <div className="flex h-screen bg-[#030308]">
      <main className="flex-1 w-full relative z-10 ml-[52px] p-3 overflow-hidden">
        <div className="scanlines fixed inset-0 pointer-events-none z-50" />

        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-cyan tracking-[0.15em] uppercase font-bold">SynthCity Terminal</span>
            <span className="text-[8px] text-dim tracking-wider">Gateway Protocol v5.1</span>
          </div>
          <div className="flex items-center gap-2 text-[8px] text-dim">
            <span>RPC: 127.0.0.1:8545</span>
            <span className="text-muted">|</span>
            <span>API: localhost:4000</span>
          </div>
        </div>

        {/* 2x2 Terminal Grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[calc(100vh-80px)]">
          <PriceFeedPanel />
          <AgentActivityFeed />
          <DomainVolatilityMatrix />
          <ProtocolHealthPanel />
        </div>
      </main>
    </div>
  );
}
