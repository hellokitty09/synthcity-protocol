/* eslint-disable */
// @ts-nocheck

// ═══════════════════════════════════════════════
//  MOCK MARKET DATA — Drop-in replacement for real APIs
//  Interface is stable. Swap generators for Chainlink/Pyth feeds later.
// ═══════════════════════════════════════════════

export interface OHLCV {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceTick {
  time: number;
  value: number;
}

export interface OracleFeed {
  name: string;
  provider: "chainlink" | "pyth" | "scraper";
  status: "live" | "degraded" | "offline";
  latency: number; // ms
  lastPrice: number;
  lastUpdate: number;
  divergence: number; // % from consensus
}

export interface AgentPrediction {
  id: string;
  agentAddress: string;
  agentType: "macro" | "supply_chain" | "geopolitical" | "sentiment";
  domain: string;
  direction: "bull" | "bear";
  confidence: number; // 0-100
  price: number;
  targetPrice: number;
  timestamp: number;
  model: string;
}

export interface BountyMarket {
  id: string;
  domain: string;
  question: string;
  totalStaked: number;
  bullPercent: number;
  expiry: number;
  status: "active" | "resolved" | "disputed";
  resolution?: "bull" | "bear";
  participants: number;
}

export interface PvPBet {
  id: string;
  challenger: string;
  defender: string;
  domain: string;
  stakeAmount: number;
  challengerDir: "bull" | "bear";
  status: "locked" | "settled" | "disputed";
  winner?: string;
}

export interface LeaderboardAgent {
  rank: number;
  address: string;
  model: string;
  type: "macro" | "supply_chain" | "geopolitical" | "sentiment";
  accuracy: number;
  totalPnl: number;
  totalPredictions: number;
  winRate: number;
  activeDomains: string[];
  isSovereign: boolean;
}

export interface DataListing {
  id: string;
  sellerAddress: string;
  sellerModel: string;
  dataType: string;
  domain: string;
  price: number;
  buyers: number;
  accuracy: number;
  isSovereign: boolean;
}

// ═══════════════════════════════════════════════
//  DOMAINS
// ═══════════════════════════════════════════════

export const DOMAINS = [
  { id: "ETH/USD", base: 3850, volatility: 0.035 },
  { id: "BTC/USD", base: 67200, volatility: 0.025 },
  { id: "XAU/USD", base: 2340, volatility: 0.008 },
  { id: "EUR/USD", base: 1.082, volatility: 0.003 },
  { id: "SOL/USD", base: 178, volatility: 0.055 },
  { id: "SPX", base: 5420, volatility: 0.012 },
];

// ═══════════════════════════════════════════════
//  GENERATORS
// ═══════════════════════════════════════════════

function randomHex(len: number): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

const MODELS = [
  "GPT-4o-mini", "Claude-3.5", "Llama-3-70B", "Mixtral-8x22B",
  "Gemini-1.5-Pro", "DeepSeek-V2", "Qwen-2-72B", "Phi-3-medium",
];

const AGENT_TYPES: AgentPrediction["agentType"][] = [
  "macro", "supply_chain", "geopolitical", "sentiment",
];

const DATA_TYPES = [
  "Price Momentum Signal", "Whale Movement Alert", "Sentiment Divergence",
  "Supply Chain Disruption", "Macro Regime Shift", "Correlation Breakdown",
  "Volatility Spike Warning", "Liquidity Gap Detection",
];

// ── Price History (OHLCV) ──

export function generateOHLCV(domainId: string, count = 120): OHLCV[] {
  const domain = DOMAINS.find((d) => d.id === domainId) || DOMAINS[0];
  const data: OHLCV[] = [];
  let price = domain.base;
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600; // 1 hour candles

  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.48) * domain.volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
    const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
    const volume = 1000000 + Math.random() * 5000000;

    data.push({
      time: now - i * interval,
      open: +open.toFixed(domain.base > 100 ? 2 : 4),
      high: +high.toFixed(domain.base > 100 ? 2 : 4),
      low: +low.toFixed(domain.base > 100 ? 2 : 4),
      close: +close.toFixed(domain.base > 100 ? 2 : 4),
      volume: +volume.toFixed(0),
    });

    price = close;
  }
  return data;
}

// ── Oracle Feeds ──

export function generateOracleFeeds(domainId: string): OracleFeed[] {
  const domain = DOMAINS.find((d) => d.id === domainId) || DOMAINS[0];
  const basePrice = domain.base * (1 + (Math.random() - 0.5) * 0.01);

  return [
    {
      name: "Chainlink",
      provider: "chainlink",
      status: Math.random() > 0.05 ? "live" : "degraded",
      latency: 80 + Math.floor(Math.random() * 120),
      lastPrice: +(basePrice * (1 + (Math.random() - 0.5) * 0.001)).toFixed(domain.base > 100 ? 2 : 4),
      lastUpdate: Date.now() - Math.floor(Math.random() * 5000),
      divergence: +(Math.random() * 0.08).toFixed(3),
    },
    {
      name: "Pyth Network",
      provider: "pyth",
      status: Math.random() > 0.03 ? "live" : "degraded",
      latency: 30 + Math.floor(Math.random() * 80),
      lastPrice: +(basePrice * (1 + (Math.random() - 0.5) * 0.001)).toFixed(domain.base > 100 ? 2 : 4),
      lastUpdate: Date.now() - Math.floor(Math.random() * 3000),
      divergence: +(Math.random() * 0.05).toFixed(3),
    },
    {
      name: "Custom Scrapers",
      provider: "scraper",
      status: Math.random() > 0.1 ? "live" : Math.random() > 0.5 ? "degraded" : "offline",
      latency: 200 + Math.floor(Math.random() * 400),
      lastPrice: +(basePrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(domain.base > 100 ? 2 : 4),
      lastUpdate: Date.now() - Math.floor(Math.random() * 10000),
      divergence: +(Math.random() * 0.15).toFixed(3),
    },
  ];
}

// ── Agent Predictions (stream) ──

export function generatePredictions(count = 25): AgentPrediction[] {
  const preds: AgentPrediction[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const agentType = AGENT_TYPES[Math.floor(Math.random() * AGENT_TYPES.length)];
    const direction = Math.random() > 0.45 ? "bull" : "bear";
    const confidence = 55 + Math.floor(Math.random() * 40);
    const priceMove = domain.base * (Math.random() * 0.05);

    preds.push({
      id: `pred-${randomHex(8)}`,
      agentAddress: `0x${randomHex(4)}...${randomHex(4)}`,
      agentType,
      domain: domain.id,
      direction,
      confidence,
      price: domain.base,
      targetPrice: direction === "bull"
        ? +(domain.base + priceMove).toFixed(domain.base > 100 ? 2 : 4)
        : +(domain.base - priceMove).toFixed(domain.base > 100 ? 2 : 4),
      timestamp: now - i * 12000 - Math.floor(Math.random() * 8000),
      model: MODELS[Math.floor(Math.random() * MODELS.length)],
    });
  }

  return preds.sort((a, b) => b.timestamp - a.timestamp);
}

// ── Bounty Markets ──

export function generateBountyMarkets(): BountyMarket[] {
  return [
    { id: "bm-1", domain: "ETH/USD", question: "ETH above §4,000 by Cycle 900?", totalStaked: 145000, bullPercent: 62, expiry: Date.now() + 3600000 * 48, status: "active", participants: 89 },
    { id: "bm-2", domain: "BTC/USD", question: "BTC breaks ATH this epoch?", totalStaked: 320000, bullPercent: 71, expiry: Date.now() + 3600000 * 120, status: "active", participants: 214 },
    { id: "bm-3", domain: "XAU/USD", question: "Gold above §2,400 at Epoch 03 start?", totalStaked: 52000, bullPercent: 55, expiry: Date.now() + 3600000 * 72, status: "active", participants: 34 },
    { id: "bm-4", domain: "SOL/USD", question: "SOL/USD crosses §200 this cycle?", totalStaked: 88000, bullPercent: 44, expiry: Date.now() + 3600000 * 24, status: "active", participants: 67 },
    { id: "bm-5", domain: "EUR/USD", question: "EUR parity by Q3?", totalStaked: 28000, bullPercent: 22, expiry: Date.now() - 3600000 * 24, status: "resolved", resolution: "bear", participants: 19 },
    { id: "bm-6", domain: "ETH/USD", question: "ETH flash crash >15% in 1 hour?", totalStaked: 410000, bullPercent: 8, expiry: Date.now() + 3600000 * 168, status: "disputed", participants: 312 },
  ];
}

// ── PvP Bets ──

export function generatePvPBets(): PvPBet[] {
  return [
    { id: "pvp-1", challenger: "0xBe21...f4a2", defender: "0xCd99...8b1c", domain: "ETH/USD", stakeAmount: 5000, challengerDir: "bull", status: "locked" },
    { id: "pvp-2", challenger: "0xFa12...3d5e", defender: "0x9e4B...c7a0", domain: "BTC/USD", stakeAmount: 12000, challengerDir: "bear", status: "locked" },
    { id: "pvp-3", challenger: "0xA3f7...1b9d", defender: "0xD3a2...5f8c", domain: "SOL/USD", stakeAmount: 3500, challengerDir: "bull", status: "settled", winner: "0xA3f7...1b9d" },
    { id: "pvp-4", challenger: "0x7c1E...a9f3", defender: "0xBe21...f4a2", domain: "XAU/USD", stakeAmount: 8000, challengerDir: "bear", status: "disputed" },
  ];
}

// ── Leaderboard ──

export function generateLeaderboard(): LeaderboardAgent[] {
  return [
    { rank: 1, address: "0xBe21...f4a2", model: "Claude-3.5", type: "macro", accuracy: 97.2, totalPnl: 284500, totalPredictions: 1247, winRate: 73.4, activeDomains: ["ETH/USD", "BTC/USD", "XAU/USD"], isSovereign: false },
    { rank: 2, address: "0xFa12...3d5e", model: "Llama-3-8B (local)", type: "sentiment", accuracy: 95.8, totalPnl: 198200, totalPredictions: 892, winRate: 71.1, activeDomains: ["ETH/USD", "SOL/USD"], isSovereign: true },
    { rank: 3, address: "0xCd99...8b1c", model: "GPT-4o-mini", type: "geopolitical", accuracy: 94.1, totalPnl: 156800, totalPredictions: 1103, winRate: 68.9, activeDomains: ["XAU/USD", "EUR/USD", "SPX"], isSovereign: false },
    { rank: 4, address: "0x9e4B...c7a0", model: "Gemini-1.5-Pro", type: "supply_chain", accuracy: 92.5, totalPnl: 142100, totalPredictions: 756, winRate: 67.2, activeDomains: ["BTC/USD", "ETH/USD"], isSovereign: false },
    { rank: 5, address: "0xA3f7...1b9d", model: "Mixtral-8x22B", type: "macro", accuracy: 91.3, totalPnl: 118900, totalPredictions: 934, winRate: 65.8, activeDomains: ["ETH/USD", "SOL/USD", "BTC/USD"], isSovereign: false },
    { rank: 6, address: "0xD3a2...5f8c", model: "Mistral-7B (local)", type: "sentiment", accuracy: 89.7, totalPnl: 95400, totalPredictions: 612, winRate: 64.1, activeDomains: ["SOL/USD"], isSovereign: true },
    { rank: 7, address: "0x7c1E...a9f3", model: "DeepSeek-V2", type: "geopolitical", accuracy: 88.2, totalPnl: 82300, totalPredictions: 845, winRate: 62.5, activeDomains: ["XAU/USD", "EUR/USD"], isSovereign: false },
    { rank: 8, address: "0x3bF9...d2e4", model: "Qwen-2-72B", type: "supply_chain", accuracy: 86.9, totalPnl: 67800, totalPredictions: 523, winRate: 61.3, activeDomains: ["BTC/USD", "SPX"], isSovereign: false },
    { rank: 9, address: "0x5aE2...b7c1", model: "Phi-3-medium", type: "macro", accuracy: 85.4, totalPnl: 54200, totalPredictions: 678, winRate: 59.8, activeDomains: ["ETH/USD"], isSovereign: false },
    { rank: 10, address: "0x8dC4...f1a6", model: "Gemma-2-9B (local)", type: "sentiment", accuracy: 83.1, totalPnl: 41500, totalPredictions: 445, winRate: 58.2, activeDomains: ["SOL/USD", "BTC/USD"], isSovereign: true },
  ];
}

// ── Data Market ──

export function generateDataListings(): DataListing[] {
  return [
    { id: "dl-1", sellerAddress: "0xBe21...f4a2", sellerModel: "Claude-3.5", dataType: "Price Momentum Signal", domain: "ETH/USD", price: 450, buyers: 34, accuracy: 94.2, isSovereign: false },
    { id: "dl-2", sellerAddress: "0xFa12...3d5e", sellerModel: "Llama-3-8B (local)", dataType: "Sentiment Divergence", domain: "ALL", price: 280, buyers: 22, accuracy: 89.1, isSovereign: true },
    { id: "dl-3", sellerAddress: "0xCd99...8b1c", sellerModel: "GPT-4o-mini", dataType: "Macro Regime Shift", domain: "XAU/USD", price: 820, buyers: 12, accuracy: 96.7, isSovereign: false },
    { id: "dl-4", sellerAddress: "0xD3a2...5f8c", sellerModel: "Mistral-7B (local)", dataType: "Whale Movement Alert", domain: "BTC/USD", price: 150, buyers: 47, accuracy: 82.3, isSovereign: true },
    { id: "dl-5", sellerAddress: "0x9e4B...c7a0", sellerModel: "Gemini-1.5-Pro", dataType: "Supply Chain Disruption", domain: "SPX", price: 1200, buyers: 8, accuracy: 91.5, isSovereign: false },
    { id: "dl-6", sellerAddress: "0x7c1E...a9f3", sellerModel: "DeepSeek-V2", dataType: "Volatility Spike Warning", domain: "SOL/USD", price: 350, buyers: 19, accuracy: 87.8, isSovereign: false },
  ];
}

// ═══════════════════════════════════════════════
//  AGENT ALIASES & GENERATIONS
// ═══════════════════════════════════════════════

export interface AgentIdentity {
  address: string;
  alias: string;
  generation: string;
  color: string;       // avatar bg
  textColor: string;   // avatar text
}

export const AGENT_IDENTITIES: Record<string, AgentIdentity> = {
  "0xBe21...f4a2": { address: "0xBe21...f4a2", alias: "VERIDIAN-7", generation: "G3", color: "#0d3320", textColor: "#34d399" },
  "0xFa12...3d5e": { address: "0xFa12...3d5e", alias: "AURUM-PRIME", generation: "G2", color: "#2a1f0a", textColor: "#fbbf24" },
  "0xCd99...8b1c": { address: "0xCd99...8b1c", alias: "CRESTLINE-4", generation: "G3", color: "#0a1a2a", textColor: "#60a5fa" },
  "0x9e4B...c7a0": { address: "0x9e4B...c7a0", alias: "NIMBUS-9", generation: "G4", color: "#1a0a2a", textColor: "#c084fc" },
  "0xA3f7...1b9d": { address: "0xA3f7...1b9d", alias: "SENTINEL-X", generation: "G3", color: "#2a0a0a", textColor: "#fb7185" },
  "0xD3a2...5f8c": { address: "0xD3a2...5f8c", alias: "FLUX-22", generation: "G2", color: "#0a2a1a", textColor: "#6ee7b7" },
  "0x7c1E...a9f3": { address: "0x7c1E...a9f3", alias: "OBSIDIAN-3", generation: "G4", color: "#1a1a0a", textColor: "#facc15" },
  "0x3bF9...d2e4": { address: "0x3bF9...d2e4", alias: "PHANTOM-11", generation: "G3", color: "#0a0a2a", textColor: "#818cf8" },
  "0x5aE2...b7c1": { address: "0x5aE2...b7c1", alias: "RELIC-5", generation: "G2", color: "#2a1a1a", textColor: "#f87171" },
  "0x8dC4...f1a6": { address: "0x8dC4...f1a6", alias: "CIPHER-0", generation: "G5", color: "#0a1a1a", textColor: "#22d3ee" },
};

export function getAgentIdentity(address: string): AgentIdentity {
  return AGENT_IDENTITIES[address] || {
    address,
    alias: address.slice(0, 8).toUpperCase(),
    generation: "G1",
    color: "#1a1a2a",
    textColor: "#7a7a8a",
  };
}

// ═══════════════════════════════════════════════
//  CONSENSUS PREDICTIONS (real-world events)
// ═══════════════════════════════════════════════

export interface ConsensusPrediction {
  id: string;
  label: string;
  category: "macro" | "geo" | "supply" | "sentiment";
  probability: number;       // 0-100
  direction: "up" | "down" | "flat";
  delta: string;             // e.g. "+4", "-3"
  agentCount: number;
  lastUpdate: string;
}

export function generateConsensusPredictions(): ConsensusPrediction[] {
  return [
    { id: "cp-1", label: "Fed holds rates at next FOMC meeting", category: "macro", probability: 72, direction: "up", delta: "+4", agentCount: 412, lastUpdate: "2m ago" },
    { id: "cp-2", label: "WTI crude above $85 by end of quarter", category: "macro", probability: 58, direction: "up", delta: "+2", agentCount: 287, lastUpdate: "5m ago" },
    { id: "cp-3", label: "EU imposes new Russia sanctions package", category: "geo", probability: 61, direction: "up", delta: "+7", agentCount: 198, lastUpdate: "8m ago" },
    { id: "cp-4", label: "Taiwan Strait incident escalation", category: "geo", probability: 23, direction: "down", delta: "-3", agentCount: 345, lastUpdate: "12m ago" },
    { id: "cp-5", label: "Port of Rotterdam congestion index rises", category: "supply", probability: 66, direction: "up", delta: "+5", agentCount: 156, lastUpdate: "15m ago" },
    { id: "cp-6", label: "Semiconductor supply chain disruption Q3", category: "supply", probability: 44, direction: "flat", delta: "0", agentCount: 234, lastUpdate: "18m ago" },
    { id: "cp-7", label: "AI regulation bill passes US Senate", category: "sentiment", probability: 31, direction: "down", delta: "-2", agentCount: 178, lastUpdate: "22m ago" },
    { id: "cp-8", label: "USD weakens vs EM basket within 30d", category: "sentiment", probability: 55, direction: "up", delta: "+3", agentCount: 312, lastUpdate: "25m ago" },
    { id: "cp-9", label: "ECB emergency rate cut before Q4", category: "macro", probability: 18, direction: "down", delta: "-5", agentCount: 401, lastUpdate: "28m ago" },
    { id: "cp-10", label: "OPEC+ extends production cuts", category: "supply", probability: 78, direction: "up", delta: "+6", agentCount: 267, lastUpdate: "31m ago" },
  ];
}

// ═══════════════════════════════════════════════
//  CLUSTER DIVERGENCE
// ═══════════════════════════════════════════════

export interface ClusterDivergence {
  category: string;
  agreement: number;  // 0-100
  color: string;
}

export function generateClusterDivergence(): ClusterDivergence[] {
  return [
    { category: "Macro", agreement: 72, color: "#60a5fa" },
    { category: "Geo", agreement: 61, color: "#c084fc" },
    { category: "Supply", agreement: 66, color: "#34d399" },
    { category: "Sentiment", agreement: 55, color: "#fbbf24" },
  ];
}

// ═══════════════════════════════════════════════
//  RESOLUTION EVENTS
// ═══════════════════════════════════════════════

export interface ResolutionEvent {
  id: string;
  icon: string;
  title: string;
  category: string;
  agentCount: number;
  timeAgo: string;
  resultPercent: string;
  isWin: boolean;
}

export function generateResolutionEvents(): ResolutionEvent[] {
  return [
    { id: "re-1", icon: "📋", title: "ECB holds rates — 3rd consecutive pause", category: "Macro", agentCount: 847, timeAgo: "6h ago", resultPercent: "+12.4%", isWin: true },
    { id: "re-2", icon: "⚡", title: "Taiwan Strait naval incident confirmed", category: "Geo", agentCount: 512, timeAgo: "1d ago", resultPercent: "+28.1%", isWin: true },
    { id: "re-3", icon: "📦", title: "Rhine water level below shipping threshold", category: "Supply", agentCount: 301, timeAgo: "2d ago", resultPercent: "-8.3%", isWin: false },
    { id: "re-4", icon: "📊", title: "US CPI print below consensus estimate", category: "Macro", agentCount: 934, timeAgo: "3d ago", resultPercent: "+6.7%", isWin: true },
    { id: "re-5", icon: "🌐", title: "BRICS summit produces trade agreement", category: "Geo", agentCount: 278, timeAgo: "4d ago", resultPercent: "+15.2%", isWin: true },
    { id: "re-6", icon: "⛽", title: "OPEC+ surprise production increase", category: "Supply", agentCount: 445, timeAgo: "5d ago", resultPercent: "-4.1%", isWin: false },
  ];
}

// ═══════════════════════════════════════════════
//  ACCURACY HISTORY (30-day sparkline)
// ═══════════════════════════════════════════════

export function generate30DayAccuracy(): number[] {
  return [61, 63, 62, 65, 64, 66, 63, 67, 68, 66, 69, 70, 68, 71, 70, 72, 71, 73, 72, 74, 73, 72, 74, 75, 73, 74, 76, 75, 73, 74];
}

export const TIER_ACCURACY = [
  { label: "Tier 1 — Skyscraper+", accuracy: 81.2 },
  { label: "Tier 2 — Authority", accuracy: 74.6 },
  { label: "Tier 3 — Specialist", accuracy: 61.3 },
  { label: "Weighted Consensus", accuracy: 73.4, highlight: true },
];

// ── Consensus Calculation ──

export function calculateConsensus(predictions: AgentPrediction[], domain: string): { bullPercent: number; bearPercent: number; avgConfidence: number } {
  const domainPreds = predictions.filter((p) => p.domain === domain);
  if (domainPreds.length === 0) return { bullPercent: 50, bearPercent: 50, avgConfidence: 0 };

  const bulls = domainPreds.filter((p) => p.direction === "bull");
  const bullPercent = Math.round((bulls.length / domainPreds.length) * 100);
  const avgConfidence = Math.round(domainPreds.reduce((s, p) => s + p.confidence, 0) / domainPreds.length);

  return { bullPercent, bearPercent: 100 - bullPercent, avgConfidence };
}
