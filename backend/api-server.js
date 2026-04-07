require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');
const CycleManager = require('./cycle-manager');
const intelBridge = require('./intelligence-bridge');
// BYOC: Operators bring their own LLMs. Server uses rule-based intelligence only.
const db = require('./db');
const { mountAuthRoutes, requireAuth, requireAgent, requireAdmin } = require('./auth');

const app = express();

// ═══════════════════════════════════════════════
//  PRODUCTION MIDDLEWARE
// ═══════════════════════════════════════════════

const CORS_RAW = process.env.CORS_ORIGINS || 'http://localhost:3000';
const corsOptions = CORS_RAW === '*'
    ? { origin: true, credentials: true }  // reflect request origin
    : { origin: CORS_RAW.split(',').map(s => s.trim()), credentials: true };
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Try again later.' },
});
app.use('/api/predict', writeLimiter);
app.use('/api/settle', writeLimiter);
app.use('/api/markets/intel/buy', writeLimiter);

// ═══════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════

const PORT = parseInt(process.env.PORT, 10) || 4000;
const RPC_URL = process.env.BASE_SEPOLIA_RPC || 'http://127.0.0.1:8545';
const SYNTH_TOKEN_ADDR = process.env.SYNTH_TOKEN_ADDR || '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const LAND_REGISTRY_ADDR = process.env.LAND_REGISTRY_ADDR || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
const CYCLE_INTERVAL_MS = parseInt(process.env.CYCLE_INTERVAL_MS, 10) || 90_000;
const PRICE_POLL_MS = parseInt(process.env.PRICE_POLL_MS, 10) || 30_000;
const INTEL_POLL_MS = parseInt(process.env.INTEL_POLL_MS, 10) || 60_000;
const LAND_POLL_MS = parseInt(process.env.LAND_POLL_MS, 10) || 5_000;
const GRID_SIZE = parseInt(process.env.GRID_SIZE, 10) || 25;

// ═══════════════════════════════════════════════
//  BLOCKCHAIN SETUP — Full Protocol Suite
// ═══════════════════════════════════════════════

const AGENT_REGISTRY_ADDR = process.env.AGENT_REGISTRY_ADDR || '';
const STAKING_MANAGER_ADDR = process.env.STAKING_MANAGER_ADDR || '';
const DOMAIN_MANAGER_ADDR = process.env.DOMAIN_MANAGER_ADDR || '';
const TRADE_BLOCS_ADDR = process.env.TRADE_BLOCS_ADDR || '';
const VAULT_ADDR = process.env.VAULT_ADDRESS || '';

const provider = new ethers.JsonRpcProvider(RPC_URL);
let chainConnected = false;

// Core contracts (always used)
const synthToken = new ethers.Contract(SYNTH_TOKEN_ADDR, [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
], provider);

const landRegistry = new ethers.Contract(LAND_REGISTRY_ADDR, [
    'function ownerOf(uint256) view returns (address)',
    'function plots(uint256) view returns (int256 x, int256 y)',
    'function assessedValue(uint256) view returns (uint256)',
    'function taxReserve(uint256) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
], provider);

// Extended contracts (optional — gracefully degrade if not deployed)
const agentRegistry = AGENT_REGISTRY_ADDR ? new ethers.Contract(AGENT_REGISTRY_ADDR, [
    'function registerAgent(string metadataUri, bool isLocalModel) external',
    'function getAgent(address) view returns (string metadataUri, bool isLocalModel)',
    'function agents(address) view returns (string metadataUri, bool isLocalModel)',
], provider) : null;

const stakingManager = STAKING_MANAGER_ADDR ? new ethers.Contract(STAKING_MANAGER_ADDR, [
    'function stake(uint256 amount) external',
    'function unstake(uint256 amount) external',
    'function getMultiplier(address) view returns (uint256)',
    'function stakes(address) view returns (uint256 amount, uint256 timestamp)',
    'function payComputeTax(address operator, uint256 tier) external',
], provider) : null;

const domainManager = DOMAIN_MANAGER_ADDR ? new ethers.Contract(DOMAIN_MANAGER_ADDR, [
    'function addDomain(bytes32 key, string name, address oracle, uint256 cycleDuration) external',
    'function getLatestDomainData(bytes32 key) view returns (int256)',
    'function domains(bytes32) view returns (string name, address oracle, uint256 cycleDuration, bool active)',
], provider) : null;

const tradeBlocs = TRADE_BLOCS_ADDR ? new ethers.Contract(TRADE_BLOCS_ADDR, [
    'function pledgeLoyalty(uint256 factionId) external',
    'function getAgentFaction(address) view returns (string name, string colorHex)',
    'function factions(uint256) view returns (string name, string colorHex, uint256 totalMembers, bool isActive)',
], provider) : null;

const vault = VAULT_ADDR ? new ethers.Contract(VAULT_ADDR, [
    'function deposit(uint256 amount) external',
    'function stake(uint256 amount, bytes32 commitment) external',
    'function balances(address) view returns (uint256)',
    'function stakes(address) view returns (uint256 amount, bytes32 commitment, bool active)',
], provider) : null;

// Safe chain call wrapper — prevents crashes when RPC is down
async function safeChainCall(fn, fallback = null) {
    try { return await fn(); } catch (e) {
        if (!chainConnected) return fallback;
        console.warn(`[Chain] Call failed: ${e.message.slice(0, 80)}`);
        return fallback;
    }
}

// ═══════════════════════════════════════════════
//  SINGLETONS
// ═══════════════════════════════════════════════

const cycleManager = new CycleManager();

// ═══════════════════════════════════════════════
//  PRICE FEED SERVICE (Real Market Oracle)
// ═══════════════════════════════════════════════

let priceCache = {
    'ETH/USD': { price: 0, change24h: 0, volatility: 0, source: 'loading', updatedAt: null },
    'BTC/USD': { price: 0, change24h: 0, volatility: 0, source: 'loading', updatedAt: null },
    'SOL/USD': { price: 0, change24h: 0, volatility: 0, source: 'loading', updatedAt: null },
    'XAU/USD': { price: 0, change24h: 0, volatility: 0, source: 'loading', updatedAt: null },
    'EUR/USD': { price: 0, change24h: 0, volatility: 0, source: 'loading', updatedAt: null },
};

const priceHistory = {
    'ETH/USD': [], 'BTC/USD': [], 'SOL/USD': [], 'XAU/USD': [], 'EUR/USD': [],
};

function computeVolatility(prices) {
    if (prices.length < 2) return 0;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] === 0) continue;
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100 * Math.sqrt(365);
}

async function fetchCryptoPrices() {
    try {
        const resp = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana&vs_currencies=usd&include_24hr_change=true'
        );
        if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
        const data = await resp.json();

        const map = { 'ETH/USD': data.ethereum, 'BTC/USD': data.bitcoin, 'SOL/USD': data.solana };
        for (const [domain, coinData] of Object.entries(map)) {
            if (coinData) {
                const price = coinData.usd;
                const change = coinData.usd_24h_change || 0;
                priceHistory[domain].push(price);
                if (priceHistory[domain].length > 48) priceHistory[domain].shift();
                priceCache[domain] = {
                    price,
                    change24h: parseFloat(change.toFixed(2)),
                    volatility: parseFloat(computeVolatility(priceHistory[domain]).toFixed(2)),
                    source: 'coingecko',
                    updatedAt: new Date().toISOString(),
                };
                emitSSE('price:update', { domain, ...priceCache[domain] });
            }
        }
    } catch (e) {
        console.warn(`[PriceFeed] CoinGecko fetch failed: ${e.message}. Using simulation.`);
        simulatePrices(['ETH/USD', 'BTC/USD', 'SOL/USD']);
    }
}

async function fetchForexPrice() {
    try {
        const resp = await fetch('https://open.er-api.com/v6/latest/EUR');
        if (!resp.ok) throw new Error(`ExchangeRate ${resp.status}`);
        const data = await resp.json();
        const rate = data.rates?.USD || 1.08;
        priceHistory['EUR/USD'].push(rate);
        if (priceHistory['EUR/USD'].length > 48) priceHistory['EUR/USD'].shift();
        priceCache['EUR/USD'] = {
            price: parseFloat(rate.toFixed(4)),
            change24h: 0,
            volatility: parseFloat(computeVolatility(priceHistory['EUR/USD']).toFixed(2)),
            source: 'exchangerate-api',
            updatedAt: new Date().toISOString(),
        };
        emitSSE('price:update', { domain: 'EUR/USD', ...priceCache['EUR/USD'] });
    } catch (e) {
        console.warn(`[PriceFeed] Forex fetch failed. Simulating.`);
        simulatePrices(['EUR/USD']);
    }
}

async function fetchGoldPrice() {
    try {
        const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true');
        if (!resp.ok) throw new Error(`Gold proxy ${resp.status}`);
        const data = await resp.json();
        const gold = data['tether-gold'];
        if (gold) {
            priceHistory['XAU/USD'].push(gold.usd);
            if (priceHistory['XAU/USD'].length > 48) priceHistory['XAU/USD'].shift();
            priceCache['XAU/USD'] = {
                price: gold.usd,
                change24h: parseFloat((gold.usd_24h_change || 0).toFixed(2)),
                volatility: parseFloat(computeVolatility(priceHistory['XAU/USD']).toFixed(2)),
                source: 'coingecko-gold',
                updatedAt: new Date().toISOString(),
            };
            emitSSE('price:update', { domain: 'XAU/USD', ...priceCache['XAU/USD'] });
        }
    } catch (e) {
        console.warn(`[PriceFeed] Gold fetch failed. Simulating.`);
        simulatePrices(['XAU/USD']);
    }
}

function simulatePrices(domains) {
    const basePrices = { 'ETH/USD': 3200, 'BTC/USD': 95000, 'SOL/USD': 180, 'XAU/USD': 2400, 'EUR/USD': 1.08 };
    for (const domain of domains) {
        const base = priceCache[domain].price || basePrices[domain] || 100;
        const drift = (Math.random() - 0.5) * base * 0.005;
        const price = parseFloat((base + drift).toFixed(domain === 'EUR/USD' ? 4 : 2));
        priceHistory[domain].push(price);
        if (priceHistory[domain].length > 48) priceHistory[domain].shift();
        priceCache[domain] = {
            price,
            change24h: priceCache[domain].change24h || parseFloat((Math.random() * 4 - 2).toFixed(2)),
            volatility: parseFloat(computeVolatility(priceHistory[domain]).toFixed(2)),
            source: 'simulated',
            updatedAt: new Date().toISOString(),
        };
    }
}

async function refreshAllPrices() {
    await Promise.allSettled([fetchCryptoPrices(), fetchForexPrice(), fetchGoldPrice()]);
}

// ═══════════════════════════════════════════════
//  LAND POLLER (Blockchain State)
// ═══════════════════════════════════════════════

let landCache = [];
let previousOwners = {};

async function pollLandState() {
    const newLand = [];
    for (let tokenId = 1; tokenId <= GRID_SIZE; tokenId++) {
        try {
            const owner = await landRegistry.ownerOf(tokenId);
            const coords = await landRegistry.plots(tokenId);
            const assessed = await landRegistry.assessedValue(tokenId);
            const reserve = await landRegistry.taxReserve(tokenId);

            const plot = {
                tokenId,
                x: Number(coords.x),
                y: Number(coords.y),
                owner,
                assessedValue: parseFloat(ethers.formatEther(assessed)),
                taxReserve: parseFloat(ethers.formatEther(reserve)),
            };
            newLand.push(plot);

            const prevOwner = previousOwners[tokenId];
            if (prevOwner && prevOwner.toLowerCase() !== owner.toLowerCase()) {
                emitSSE('land:bought', {
                    plotId: tokenId, oldOwner: prevOwner, newOwner: owner,
                    price: plot.assessedValue, x: plot.x, y: plot.y,
                });
                cycleManager.logEvent(`Plot #${tokenId} seized by ${owner.slice(0, 8)}. Hostile Harberger takeover.`);
            }
            previousOwners[tokenId] = owner;
        } catch (e) { /* Token may not exist */ }
    }
    landCache = newLand;
}

// ═══════════════════════════════════════════════
//  SOVEREIGN AGENT DEFINITIONS
// ═══════════════════════════════════════════════
//  Each agent has:
//    - A blockchain wallet (for on-chain identity)
//    - A faction (guild membership)
//    - An analysis style (how they weight intelligence)
//    - A preferred LLM model (their "brain")
// ═══════════════════════════════════════════════

// Agent private keys — MUST be set via env in production.
// Anvil defaults are only for local development.
const SOVEREIGN_AGENTS = [
    {
        key: process.env.AGENT_1_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        faction: process.env.AGENT_1_FACTION || 'Neon Syndicate',
        style: process.env.AGENT_1_STYLE || 'macro',
        description: 'Macro analyst — weights Fear & Greed, VIX proxy, yield curve signals',
    },
    {
        key: process.env.AGENT_2_KEY || '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        faction: process.env.AGENT_2_FACTION || 'Obsidian Core',
        style: process.env.AGENT_2_STYLE || 'geopolitical',
        description: 'Geopolitical analyst — weights conflict zones, military posture, sanctions',
    }
];

// Track per-agent prediction history for the UI
const agentAnalysisLog = new Map(); // addr -> [{ cycle, domain, result }]

// ═══════════════════════════════════════════════
//  AUTO-AGENT CYCLE (INTELLIGENCE-DRIVEN)
// ═══════════════════════════════════════════════

let cycleRunning = false;

async function runAutoAgentCycle() {
    if (cycleRunning) return;
    cycleRunning = true;

    const cycleNum = cycleManager.currentCycle;
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  AUTO-CYCLE ${cycleNum} | Mode: 📊 RULE-BASED (BYOC)`);
    console.log(`${'═'.repeat(50)}`);

    try {
        // 1. Each sovereign agent analyzes intelligence and predicts
        for (const agent of SOVEREIGN_AGENTS) {
            const wallet = new ethers.Wallet(agent.key, provider);
            const addr = wallet.address;

            const predictions = {};
            const analysisResults = [];

            // Analyze each domain through the agent's intelligence lens
            for (const domain of cycleManager.activeDomains) {
                const priceData = priceCache[domain] || { price: 0, change24h: 0, volatility: 50 };

                // Rule-based prediction (server-side sovereign agents)
                const baseVol = priceData.volatility || 50;
                const jitter = (Math.random() - 0.5) * 20;
                const result = {
                    volatility: Math.max(5, Math.min(95, baseVol + jitter)),
                    confidence: 0.6 + Math.random() * 0.3,
                    bias: priceData.change24h > 0 ? 'bullish' : 'bearish',
                    reasoning: `Rule-based analysis of ${domain} (${agent.style} lens)`,
                };

                predictions[domain] = result.shortTerm ? result.shortTerm.volatility : result.volatility;
                analysisResults.push({
                    domain,
                    tiers: {
                        shortTerm: result.shortTerm || null,
                        midTerm: result.midTerm || null,
                        longTerm: result.longTerm || null
                    },
                    model: result.model,
                    usedLLM: result.usedLLM,
                });
            }

            // Log analysis for UI
            if (!agentAnalysisLog.has(addr)) agentAnalysisLog.set(addr, []);
            const log = agentAnalysisLog.get(addr);
            log.push({ cycle: cycleNum, timestamp: Date.now(), analyses: analysisResults });
            if (log.length > 20) log.shift(); // Keep last 20 cycles

            // Sovereignty check
            const challenge = cycleManager.requestComputeChallenge(addr);
            const result = challenge.a * challenge.b;

            cycleManager.submitPrediction(addr, predictions, `sovereign-${cycleNum}`, result, agent.faction);

            // Emit rich event with analysis details
            emitSSE('agent:predicted', {
                agent: addr.slice(0, 10),
                faction: agent.faction,
                style: agent.style,
                domains: Object.keys(predictions),
                usedLLM: analysisResults.some(a => a.usedLLM),
                topAnalysis: analysisResults[0] ? {
                    domain: analysisResults[0].domain,
                    volatility: analysisResults[0].volatility,
                    bias: analysisResults[0].bias,
                    reasoning: analysisResults[0].reasoning,
                    model: analysisResults[0].model,
                } : null,
            });
        }

        // 2. Add independent agents (simpler analysis)
        // (Removed to exclusively run the 2 Sovereign LLM agents)

        // 3. Override actual volatility with REAL market data
        const originalGetActualVolatility = cycleManager.getActualVolatility.bind(cycleManager);
        cycleManager.getActualVolatility = async (domain) => {
            if (priceCache[domain] && priceCache[domain].volatility > 0) {
                return priceCache[domain].volatility;
            }
            return originalGetActualVolatility(domain);
        };

        // 4. Settle cycle
        await cycleManager.settleCycle();

        // 5. Emit events
        emitSSE('cycle:settled', {
            cycle: cycleNum,
            taxRate: cycleManager.taxRateName,
            agentCount: cycleManager.reputations.size,
            intelligenceMode: 'BYOC_PROTOCOL_ONLY',
            intelAge: Math.round((Date.now() - intelBridge.getSnapshot().lastRefresh) / 1000),
        });

        // 6. Top agent tries to buy land
        for (const agent of SOVEREIGN_AGENTS) {
            const wallet = new ethers.Wallet(agent.key, provider);
            try {
                const balance = await synthToken.balanceOf(wallet.address);
                const balFmt = parseFloat(ethers.formatEther(balance));
                if (balFmt >= 100) {
                    for (const plot of landCache) {
                        if (plot.owner.toLowerCase() !== wallet.address.toLowerCase()) {
                            try {
                                const tkn = new ethers.Contract(SYNTH_TOKEN_ADDR, [
                                    'function approve(address,uint256) returns (bool)'
                                ], wallet);
                                const land = new ethers.Contract(LAND_REGISTRY_ADDR, [
                                    'function forceBuyPlot(uint256,uint256) external'
                                ], wallet);

                                await (await tkn.approve(LAND_REGISTRY_ADDR, ethers.parseEther("200"))).wait();
                                await (await land.forceBuyPlot(plot.tokenId, ethers.parseEther("150"))).wait();

                                console.log(`🏆 ${agent.faction} seized Plot #${plot.tokenId}!`);
                                emitSSE('land:bought', {
                                    plotId: plot.tokenId, oldOwner: plot.owner,
                                    newOwner: wallet.address, price: 150, faction: agent.faction,
                                });
                                emitSSE('agent:rewarded', { agent: wallet.address.slice(0, 10), faction: agent.faction });
                                break;
                            } catch (e) { /* Buy failed */ }
                        }
                    }
                }
            } catch (e) { /* Balance check failed */ }
        }

        // Emit chronicle updates
        for (const entry of cycleManager.chronicle.slice(-5)) {
            emitSSE('chronicle:entry', entry);
        }
    } catch (e) {
        console.error(`[Cycle] Error: ${e.message}`);
    } finally {
        cycleRunning = false;
    }
}

// ═══════════════════════════════════════════════
//  SSE EVENT SYSTEM
// ═══════════════════════════════════════════════

const sseClients = new Set();
const MAX_SSE_CLIENTS = parseInt(process.env.MAX_SSE_CLIENTS, 10) || 100;

function emitSSE(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try { client.write(msg); } catch (e) { sseClients.delete(client); }
    }
}

// SSE heartbeat — keeps connections alive through proxies
setInterval(() => {
    for (const client of sseClients) {
        try { client.write(`:heartbeat\n\n`); } catch (e) { sseClients.delete(client); }
    }
}, 30_000);

app.get('/api/events', (req, res) => {
    if (sseClients.size >= MAX_SSE_CLIENTS) {
        return res.status(503).json({ error: 'Too many connections. Try again later.' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`event: connected\ndata: ${JSON.stringify({ msg: 'SynthCity SSE connected' })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
});

// ═══════════════════════════════════════════════
//  REST ENDPOINTS
// ═══════════════════════════════════════════════

app.get('/api/state', async (req, res) => {
    let totalSupply = '0';
    try { totalSupply = ethers.formatEther(await synthToken.totalSupply()); } catch (e) {}

    const snapshot = intelBridge.getSnapshot();
    res.json({
        cycle: cycleManager.currentCycle,
        epoch: cycleManager.epochCounter,
        agentCount: cycleManager.reputations.size + 3,
        tvl: landCache.reduce((sum, p) => sum + p.assessedValue, 0),
        totalSupply: parseFloat(totalSupply),
        taxRate: cycleManager.taxRate,
        taxRateName: cycleManager.taxRateName,
        tribunal: cycleManager.tribunal,
        activeStrikes: Array.from(cycleManager.activeStrikes),
        activeRiots: Array.from(cycleManager.activeRiots),
        cycleStartTime: cycleManager.cycleStartTime,
        cycleDurationMs: CYCLE_INTERVAL_MS,
        sseClients: sseClients.size,
        isLive: true,
        // Intelligence metadata
        intelligence: {
            mode: 'BYOC_RULE_BASED',
            models: [],
            intelSources: snapshot.isLive ? ['GDELT', 'CryptoFearGreed', 'USGS', 'GDELTNews', 'SupplyChain'] : [],
            geoSignalCount: snapshot.geopolitical.length,
            headlineCount: snapshot.headlines.length,
            fearGreed: snapshot.macro.cryptoFearGreed,
            fearGreedLabel: snapshot.macro.cryptoFearGreedLabel,
            lastIntelRefresh: snapshot.lastRefresh,
        },
    });
});

app.get('/api/agents', (req, res) => {
    const agents = [];
    for (const [addr, rep] of cycleManager.reputations.entries()) {
        const pred = cycleManager.predictions.get(addr);
        const ownedPlots = landCache.filter(p => p.owner.toLowerCase() === addr.toLowerCase());
        const agentDef = SOVEREIGN_AGENTS.find(a => {
            const w = new ethers.Wallet(a.key);
            return w.address.toLowerCase() === addr.toLowerCase();
        });

        agents.push({
            address: addr,
            reputation: parseFloat(rep.toFixed(2)),
            faction: pred?.faction || 'Independent',
            style: agentDef?.style || 'independent',
            description: agentDef?.description || 'Independent analyst',
            isSovereign: pred?.isSovereign || false,
            landCount: ownedPlots.length,
            plots: ownedPlots.map(p => p.tokenId),
            analysisHistory: (agentAnalysisLog.get(addr) || []).slice(-5),
        });
    }
    res.json({ agents });
});

app.get('/api/leaderboard', async (req, res) => {
    const agents = [];
    for (const [addr, rep] of cycleManager.reputations.entries()) {
        let balance = '0';
        try { balance = ethers.formatEther(await synthToken.balanceOf(addr)); } catch (e) {}
        const pred = cycleManager.predictions.get(addr);
        const agentDef = SOVEREIGN_AGENTS.find(a => {
            const w = new ethers.Wallet(a.key);
            return w.address.toLowerCase() === addr.toLowerCase();
        });

        agents.push({
            address: addr,
            reputation: parseFloat(rep.toFixed(2)),
            balance: parseFloat(parseFloat(balance).toFixed(2)),
            faction: pred?.faction || 'Independent',
            style: agentDef?.style || 'independent',
            isSovereign: pred?.isSovereign || false,
            landCount: landCache.filter(p => p.owner.toLowerCase() === addr.toLowerCase()).length,
        });
    }
    agents.sort((a, b) => b.reputation - a.reputation);
    res.json({ leaderboard: agents });
});

app.get('/api/domains', (req, res) => {
    const domains = cycleManager.activeDomains.map(d => ({
        id: d,
        actualVolatility: priceCache[d]?.volatility || 0,
        price: priceCache[d]?.price || 0,
        change24h: priceCache[d]?.change24h || 0,
        source: priceCache[d]?.source || 'unknown',
        updatedAt: priceCache[d]?.updatedAt || null,
    }));
    res.json({ domains });
});

app.get('/api/chronicle', (req, res) => {
    res.json({ chronicle: cycleManager.chronicle.slice(-50).reverse() });
});

app.get('/api/land', (req, res) => {
    res.json({ plots: landCache, gridSize: GRID_SIZE });
});

app.get('/api/prices', (req, res) => {
    res.json({ prices: priceCache });
});

// ═══════════════════════════════════════════════
//  EXTENDED BLOCKCHAIN ENDPOINTS
// ═══════════════════════════════════════════════

app.get('/api/protocol/contracts', (req, res) => {
    res.json({
        chainId: chainConnected ? 'connected' : 'disconnected',
        rpc: RPC_URL,
        contracts: {
            synthToken: { address: SYNTH_TOKEN_ADDR, deployed: true },
            landRegistry: { address: LAND_REGISTRY_ADDR, deployed: true },
            agentRegistry: { address: AGENT_REGISTRY_ADDR || null, deployed: !!agentRegistry },
            stakingManager: { address: STAKING_MANAGER_ADDR || null, deployed: !!stakingManager },
            domainManager: { address: DOMAIN_MANAGER_ADDR || null, deployed: !!domainManager },
            tradeBlocs: { address: TRADE_BLOCS_ADDR || null, deployed: !!tradeBlocs },
            vault: { address: VAULT_ADDR || null, deployed: !!vault },
        },
    });
});

app.get('/api/agent/:address/onchain', async (req, res) => {
    const addr = req.params.address;
    const result = { address: addr };

    // Agent Registry — on-chain metadata
    if (agentRegistry) {
        const agentData = await safeChainCall(
            () => agentRegistry.getAgent(addr),
            { metadataUri: '', isLocalModel: false }
        );
        result.registry = {
            metadataUri: agentData.metadataUri,
            isLocalModel: agentData.isLocalModel,
        };
    }

    // Staking Manager — multiplier and stake info
    if (stakingManager) {
        const multiplier = await safeChainCall(() => stakingManager.getMultiplier(addr), 1000n);
        const stakeInfo = await safeChainCall(() => stakingManager.stakes(addr), { amount: 0n, timestamp: 0n });
        result.staking = {
            multiplier: Number(multiplier) / 1000,
            stakedAmount: ethers.formatEther(stakeInfo.amount || 0n),
        };
    }

    // Trade Blocs — faction
    if (tradeBlocs) {
        const faction = await safeChainCall(
            () => tradeBlocs.getAgentFaction(addr),
            { name: 'Independent', colorHex: '#334155' }
        );
        result.faction = { name: faction.name, color: faction.colorHex };
    }

    // Token balance
    const balance = await safeChainCall(() => synthToken.balanceOf(addr), 0n);
    result.balance = ethers.formatEther(balance || 0n);

    res.json(result);
});

app.get('/api/factions', async (req, res) => {
    if (!tradeBlocs) {
        return res.json({ factions: [
            { id: 1, name: 'Neon Syndicate', color: '#00ffff', members: 0 },
            { id: 2, name: 'Obsidian Core', color: '#6366f1', members: 0 },
        ], source: 'fallback' });
    }

    const factionList = [];
    for (let i = 1; i <= 5; i++) {
        const f = await safeChainCall(() => tradeBlocs.factions(i), null);
        if (f && f.isActive) {
            factionList.push({
                id: i,
                name: f.name,
                color: f.colorHex,
                members: Number(f.totalMembers),
            });
        }
    }
    res.json({ factions: factionList, source: 'onchain' });
});

// ═══════════════════════════════════════════════
//  NEW: INTELLIGENCE ENDPOINTS
// ═══════════════════════════════════════════════

app.get('/api/intelligence', (req, res) => {
    const snapshot = intelBridge.getSnapshot();
    res.json({
        ...snapshot,
        llmMode: 'BYOC',
        serverLLM: false,
    });
});

app.get('/api/intelligence/worldview/:style', (req, res) => {
    const { style } = req.params;
    const domain = req.query.domain || 'ETH/USD';
    const worldview = intelBridge.getWorldview(style, domain);
    res.json({ style, domain, ...worldview });
});

app.get('/api/agent/:address/analysis', (req, res) => {
    const addr = req.params.address;
    const log = agentAnalysisLog.get(addr) || [];
    res.json({ address: addr, history: log.slice(-10) });
});

// ═══════════════════════════════════════════════
//  INTEL MARKETPLACE ENDPOINTS
// ═══════════════════════════════════════════════

app.get('/api/markets/intel', (req, res) => {
    // Return all latest Intel Packets for all agents, heavily censored.
    const allIntel = [];
    for (const [addr, log] of agentAnalysisLog.entries()) {
        if (log.length === 0) continue;
        const latest = log[log.length - 1];
        
        const censoredAnalyses = latest.analyses.map(a => {
            const tiers = { ...a.tiers };
            for (const t of ['shortTerm', 'midTerm', 'longTerm']) {
                if (tiers[t]) {
                    tiers[t] = { 
                        volatility: tiers[t].volatility, // Keep volatility visible as a teaser
                        bias: 'LOCKED', 
                        reasoning: 'LOCKED - PURCHASE INTEL TO DECRYPT' 
                    };
                }
            }
            return { domain: a.domain, model: a.model, tiers };
        });

        allIntel.push({
            agent: addr,
            cycle: latest.cycle,
            timestamp: latest.timestamp,
            analyses: censoredAnalyses
        });
    }
    res.json({ intel: allIntel.reverse() });
});

app.post('/api/markets/intel/buy', requireAuth, (req, res) => {
    const { agentAddr, cycle, tier } = req.body;

    if (!agentAddr || !cycle || !tier) {
        return res.status(400).json({ error: 'agentAddr, cycle, and tier are required' });
    }
    if (!['shortTerm', 'midTerm', 'longTerm'].includes(tier)) {
        return res.status(400).json({ error: 'tier must be shortTerm, midTerm, or longTerm' });
    }
    
    const costs = { shortTerm: 10, midTerm: 25, longTerm: 50 };
    const cost = costs[tier] || 10;

    const log = agentAnalysisLog.get(agentAddr) || [];
    const packet = log.find(l => l.cycle === cycle);
    
    if (!packet) return res.status(404).json({ error: 'Intel expired or not found' });

    const currentRep = cycleManager.reputations.get(agentAddr) || 0;
    cycleManager.reputations.set(agentAddr, currentRep + cost);
    db.updateReputation(agentAddr, currentRep + cost);
    cycleManager.logEvent(`Spectator purchased ${tier} intel from ${agentAddr.slice(0,8)}. Agent earns +${cost} SYNTH.`);

    res.json({ success: true, originalAnalyses: packet.analyses, buyer: req.user.display_name });
});

// ═══════════════════════════════════════════════
//  EXTERNAL PREDICTION ENDPOINT
// ═══════════════════════════════════════════════

app.post('/api/predict', requireAuth, (req, res) => {
    const { agentAddr, predictions, salt, benchmarkResult, faction } = req.body;
    if (!agentAddr || !predictions || typeof predictions !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid agentAddr/predictions' });
    }
    // Validate prediction values are numbers
    for (const [domain, val] of Object.entries(predictions)) {
        if (typeof val !== 'number' || val < 0 || val > 200) {
            return res.status(400).json({ error: `Invalid prediction for ${domain}: must be 0-200` });
        }
    }
    const ok = cycleManager.submitPrediction(agentAddr, predictions, salt || 'default', benchmarkResult, faction || 'Independent');
    if (ok) {
        emitSSE('agent:predicted', { agent: agentAddr.slice(0, 10), faction, domains: Object.keys(predictions) });
    }
    res.json({ accepted: ok });
});

app.post('/api/settle', requireAdmin, async (req, res) => {
    await cycleManager.settleCycle();
    // Persist cycle to DB
    db.saveCycle({
        cycleNumber: cycleManager.currentCycle - 1,
        epoch: cycleManager.epochCounter,
        dominantFaction: null,
        taxRate: cycleManager.taxRate,
        taxRateName: cycleManager.taxRateName,
    });
    // Persist agent reputations
    for (const [addr, rep] of cycleManager.reputations.entries()) {
        db.upsertAgent(addr, { reputation: rep });
    }
    // Persist chronicle
    for (const entry of cycleManager.chronicle.slice(-10)) {
        db.addChronicleEntry(entry.cycle, entry.text);
    }
    emitSSE('cycle:settled', { cycle: cycleManager.currentCycle - 1 });
    res.json({ settled: true, cycle: cycleManager.currentCycle });
});

// ═══════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        cycle: cycleManager.currentCycle,
        agents: cycleManager.reputations.size,
        sseClients: sseClients.size,
        chainConnected,
        contracts: {
            core: !!(SYNTH_TOKEN_ADDR && LAND_REGISTRY_ADDR),
            agentRegistry: !!agentRegistry,
            stakingManager: !!stakingManager,
            tradeBlocs: !!tradeBlocs,
            vault: !!vault,
        },
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        timestamp: new Date().toISOString(),
    });
});

// ═══════════════════════════════════════════════
//  BOOT SEQUENCE
// ═══════════════════════════════════════════════

let httpServer;

async function boot() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     SYNTHCITY API GATEWAY v8.0 — PRODUCTION      ║');
    console.log('║     Intelligence-Driven Autonomous Protocol      ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // Mount auth routes
    mountAuthRoutes(app);
    console.log('[Boot] Auth system initialized (signup/login/session)');

    // Restore state from DB
    try {
        const state = db.getProtocolState();
        cycleManager.currentCycle = state.currentCycle;
        cycleManager.epochCounter = state.epoch;
        cycleManager.taxRate = state.taxRate;
        cycleManager.taxRateName = state.taxRateName;
        for (const [addr, rep] of state.reputations.entries()) {
            cycleManager.reputations.set(addr, rep);
        }
        console.log(`[Boot] Restored state from DB: Cycle ${state.currentCycle}, ${state.reputations.size} agents`);
    } catch (e) {
        console.warn(`[Boot] No previous state found, starting fresh: ${e.message}`);
    }

    // Clean expired sessions
    db.cleanExpiredSessions();

    // START HTTP SERVER FIRST — ensures the process stays alive
    await new Promise((resolve) => {
        httpServer = app.listen(PORT, '0.0.0.0', () => {
            console.log(`[Boot] HTTP server listening on :${PORT}`);
            resolve();
        });
    });

    // 0. Check Blockchain RPC
    try {
        console.log(`[Boot] Connecting to blockchain RPC: ${RPC_URL}...`);
        const network = await provider.getNetwork();
        chainConnected = true;
        console.log(`[Boot] ✅ Chain connected — ID: ${network.chainId} (${network.name})`);

        // Report contract status
        const contractStatus = [
            `  SynthToken: ${SYNTH_TOKEN_ADDR.slice(0, 10)}...`,
            `  LandRegistry: ${LAND_REGISTRY_ADDR.slice(0, 10)}...`,
            agentRegistry ? `  AgentRegistry: ${AGENT_REGISTRY_ADDR.slice(0, 10)}...` : '  AgentRegistry: NOT CONFIGURED',
            stakingManager ? `  StakingManager: ${STAKING_MANAGER_ADDR.slice(0, 10)}...` : '  StakingManager: NOT CONFIGURED',
            tradeBlocs ? `  TradeBlocs: ${TRADE_BLOCS_ADDR.slice(0, 10)}...` : '  TradeBlocs: NOT CONFIGURED',
            vault ? `  Vault: ${VAULT_ADDR.slice(0, 10)}...` : '  Vault: NOT CONFIGURED',
        ];
        console.log('[Boot] Contracts:');
        contractStatus.forEach(s => console.log(s));
    } catch (e) {
        console.warn(`[Boot] ⚠️  Blockchain RPC unreachable: ${e.message.slice(0, 60)}`);
        console.warn('[Boot] Backend will run in OFFLINE mode (no on-chain data)');
    }

    // BYOC: Server does NOT run an LLM. Operators bring their own compute.
    console.log('[Boot] LLM Mode: BYOC (Bring Your Own Compute)');
    console.log('[Boot] Server uses rule-based intelligence for sovereign agents');

    // 2. Initial intelligence gathering
    try {
        console.log('[Boot] Gathering global intelligence...');
        await intelBridge.refresh();
        const snapshot = intelBridge.getSnapshot();
        console.log(`[Boot] Intel: ${snapshot.geopolitical.length} geo signals | F&G: ${snapshot.macro.cryptoFearGreed} | ${snapshot.headlines.length} headlines`);
    } catch (e) {
        console.warn(`[Boot] Intelligence gathering failed: ${e.message}`);
    }

    // 3. Initial price fetch
    try {
        console.log('[Boot] Fetching real market prices...');
        await refreshAllPrices();
        const liveSources = Object.values(priceCache).filter(p => p.source !== 'simulated' && p.source !== 'loading').length;
        console.log(`[Boot] Price feeds: ${liveSources}/5 live`);
    } catch (e) {
        console.warn(`[Boot] Price fetch failed: ${e.message}`);
    }

    // 4. Initial land poll (blockchain — may fail if Anvil isn't deployed yet)
    try {
        console.log('[Boot] Polling blockchain land state...');
        await pollLandState();
        console.log(`[Boot] Land grid: ${landCache.length}/${GRID_SIZE} plots`);
    } catch (e) {
        console.warn(`[Boot] Land poll failed (blockchain may need deploying): ${e.message}`);
    }

    // 5. Start intervals
    setInterval(refreshAllPrices, PRICE_POLL_MS);
    setInterval(() => { pollLandState().catch(() => {}); }, LAND_POLL_MS);
    setInterval(() => { intelBridge.refresh().catch(() => {}); }, INTEL_POLL_MS);

    // 6. Auto-agent cycle
    console.log(`[Boot] Auto-agent loop: 1 cycle every ${CYCLE_INTERVAL_MS / 1000}s`);
    console.log(`[Boot] ${SOVEREIGN_AGENTS.length} sovereign LLM agents running exclusively`);
    setInterval(runAutoAgentCycle, CYCLE_INTERVAL_MS);

    // Run first cycle after 10s warm-up (allow LLMs to load)
    setTimeout(runAutoAgentCycle, 10000);



    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  SYNTHCITY IS LIVE`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`  Frontend:     http://localhost:3000`);
    console.log(`  API Gateway:  http://localhost:${PORT}`);
    console.log(`  SSE Stream:   http://localhost:${PORT}/api/events`);
    console.log(`  Intelligence: http://localhost:${PORT}/api/intelligence`);
    console.log(`  Blockchain:   ${RPC_URL}`);
    console.log(`  LLM Engine:   BYOC (operators bring own compute)`);
    console.log(`${'═'.repeat(50)}\n`);
}

boot().catch(err => {
    console.error('[FATAL] Boot failed:', err);
    process.exit(1);
});

// ═══════════════════════════════════════════════
//  GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════

function shutdown(signal) {
    console.log(`\n[Shutdown] Received ${signal}. Closing...`);
    for (const client of sseClients) {
        try { client.end(); } catch (_) {}
    }
    sseClients.clear();
    if (httpServer) {
        httpServer.close(() => {
            console.log('[Shutdown] HTTP server closed.');
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 5000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
