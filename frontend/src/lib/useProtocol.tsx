"use client";

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Mirroring the backend structures
export interface ProtocolState {
  cycle: number;
  epoch: number;
  agentCount: number;
  tvl: number;
  totalSupply: number;
  taxRate: number;
  taxRateName: string;
  tribunal: string[];
  activeStrikes: any[];
  activeRiots: any[];
  cycleStartTime: number;
  cycleDurationMs: number;
  sseClients: number;
  isLive: boolean;
  intelligence: any;
}

export interface Agent {
  reputation: number;
  predictions: number;
  accuracy: number;
  lastPrediction: number;
  totalPnl: number;
  faction: string;
  sovereign: boolean;
  model: string;
  isSovereign: boolean;
}

export interface LandPlot {
  tokenId: number;
  owner: string;
  assessedValue: number;
  taxReserve: number;
  lastTaxPaidAt: number;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api`;

export function useProtocolData() {
  const [state, setState] = useState<ProtocolState | null>(null);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [land, setLand] = useState<Record<string, LandPlot>>({});
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [chronicle, setChronicle] = useState<any[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [spectatorBalance, setSpectatorBalance] = useState<number>(1000);

  const unlockIntel = async (agentAddr: string, cycle: number, tier: string, cost: number) => {
    if (spectatorBalance < cost) return null;
    try {
      const res = await fetch(`${API_BASE}/markets/intel/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentAddr, cycle, tier })
      });
      const data = await res.json();
      if (data.success) {
        setSpectatorBalance(prev => prev - cost);
        return data.originalAnalyses;
      }
    } catch(e) { console.error(e); }
    return null;
  };

  // Fetch initial REST data
  const fetchAll = useCallback(async () => {
    try {
      const [stateRes, agentsRes, landRes, pricesRes, chronRes] = await Promise.all([
        fetch(`${API_BASE}/state`).then(r => r.json()),
        fetch(`${API_BASE}/agents`).then(r => r.json()),
        fetch(`${API_BASE}/land`).then(r => r.json()),
        fetch(`${API_BASE}/prices`).then(r => r.json()),
        fetch(`${API_BASE}/chronicle`).then(r => r.json()),
      ]);
      setState(stateRes.state || stateRes);
      setAgents(agentsRes.agents || agentsRes);
      setLand(landRes.land || landRes);
      setPrices(pricesRes.prices || pricesRes);
      setChronicle(chronRes.chronicle || []);
      setIsLive(true);
    } catch (e) {
      console.warn("API offline, falling back to mock mode");
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Polling fallback every 10s
    const pollInterval = setInterval(fetchAll, 10000);

    // Setup SSE
    const eventSource = new EventSource(`${API_BASE}/events`);

    eventSource.onopen = () => {
      console.log("SSE connected");
      setIsLive(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;
        const payload = data.payload;

        setLastEvent({ type, data: payload, timestamp: Date.now() });

        if (type === 'cycle:settled') {
          // A cycle completed, which changes multiple things, let's trigger a full fetch
          fetchAll();
        } else if (type === 'land:bought' || type === 'land:foreclosed') {
          // Instead of writing a complex localized reducer for now just fetch fresh land data
          fetch(`${API_BASE}/land`).then(r => r.json()).then(res => setLand(res.land || res));
        } else if (type === 'price:update') {
          fetch(`${API_BASE}/prices`).then(r => r.json()).then(res => setPrices(res.prices || res));
        } else if (type === 'chronicle:entry') {
          setChronicle(prev => [payload, ...prev].slice(0, 50));
        } else if (type === 'agent:predicted' || type === 'agent:rewarded') {
          fetch(`${API_BASE}/agents`).then(r => r.json()).then(res => setAgents(res.agents || res));
        } else if (type === 'tribunal:elected' || type === 'strike:declared' || type === 'riot:escalated') {
          fetch(`${API_BASE}/state`).then(r => r.json()).then(res => setState(res.state || res));
        }

        // Custom Event for toast notifications
        window.dispatchEvent(new CustomEvent('synthcity:sse', { detail: { type, payload } }));

      } catch (err) {
        console.error("SSE Parse Error", err);
      }
    };

    eventSource.onerror = () => {
       console.warn("SSE connection error");
       setIsLive(false);
    };

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [fetchAll]);

  return { state, agents, land, prices, chronicle, isLive, fetchAll, lastEvent, spectatorBalance, unlockIntel };
}

// React Context
const ProtocolContext = createContext<ReturnType<typeof useProtocolData> | null>(null);

export function ProtocolProvider({ children }: { children: React.ReactNode }) {
  const data = useProtocolData();
  return <ProtocolContext.Provider value={data}>{children}</ProtocolContext.Provider>;
}

export function useProtocol() {
  const context = useContext(ProtocolContext);
  if (!context) {
    throw new Error('useProtocol must be used within ProtocolProvider');
  }
  return context;
}
