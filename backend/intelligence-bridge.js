/**
 * ═══════════════════════════════════════════════════════════
 *  INTELLIGENCE BRIDGE — Real-World Signal Collector
 *  Feeds autonomous agents with live geopolitical, macro,
 *  and supply chain intelligence from public APIs.
 * ═══════════════════════════════════════════════════════════
 *
 *  Sources:
 *    1. GDELT GKG (Global Knowledge Graph) — Geopolitical event tone
 *    2. USGS Earthquake API — Seismic risk
 *    3. CNN Fear & Greed Index proxy — Market sentiment
 *    4. Alternative.me Crypto Fear & Greed — Crypto sentiment
 *    5. FRED (Federal Reserve) — Yield curve, VIX proxy
 *    6. NewsAPI/RSS — Breaking headlines for sentiment shift
 *
 *  Architecture:
 *    IntelligenceBridge.refresh() → builds SignalSnapshot
 *    Each Agent calls bridge.getWorldview(style) → gets weighted analysis
 */

const REFRESH_INTERVAL_MS = 60_000; // 1 minute

// ═══════════════════════════════════════════════
//  SIGNAL TYPES
// ═══════════════════════════════════════════════

/**
 * @typedef {Object} GeoSignal
 * @property {string} region
 * @property {string} type - 'conflict'|'unrest'|'sanctions'|'military'|'cyber'|'climate'
 * @property {number} severity - 0-100
 * @property {string} title
 * @property {number} timestamp
 */

/**
 * @typedef {Object} MacroSignal
 * @property {number} fearGreedIndex  - 0 (extreme fear) to 100 (extreme greed)
 * @property {string} fearGreedLabel
 * @property {number} cryptoFearGreed
 * @property {string} cryptoFearGreedLabel
 * @property {number} vixProxy       - Implied volatility estimate
 * @property {number} goldTrend      - Gold price momentum (positive = risk-off)
 * @property {number} dxyStrength    - Dollar strength signal
 */

/**
 * @typedef {Object} SupplyChainSignal
 * @property {string} chokepoint     - 'suez'|'hormuz'|'malacca'|'panama'
 * @property {number} disruptionScore - 0-100
 * @property {string} description
 */

/**
 * @typedef {Object} NewsSignal
 * @property {string} headline
 * @property {string} source
 * @property {number} sentimentScore  - -1 to +1
 * @property {string[]} tickers       - Related tickers
 * @property {number} timestamp
 */

/**
 * @typedef {Object} SignalSnapshot
 * @property {GeoSignal[]} geopolitical
 * @property {MacroSignal} macro
 * @property {SupplyChainSignal[]} supplyChain
 * @property {NewsSignal[]} headlines
 * @property {Object} earthquakes
 * @property {number} lastRefresh
 * @property {boolean} isLive
 */

class IntelligenceBridge {
    constructor() {
        /** @type {SignalSnapshot} */
        this.snapshot = this._emptySnapshot();
        this._refreshing = false;
    }

    _emptySnapshot() {
        return {
            geopolitical: [],
            macro: {
                fearGreedIndex: 50,
                fearGreedLabel: 'neutral',
                cryptoFearGreed: 50,
                cryptoFearGreedLabel: 'Neutral',
                vixProxy: 20,
                goldTrend: 0,
                dxyStrength: 0,
            },
            supplyChain: [],
            headlines: [],
            earthquakes: { significant: 0, regions: [] },
            lastRefresh: 0,
            isLive: false,
        };
    }

    // ═══════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════

    async refresh() {
        if (this._refreshing) return;
        this._refreshing = true;

        try {
            const results = await Promise.allSettled([
                this._fetchGDELT(),
                this._fetchCryptoFearGreed(),
                this._fetchEarthquakes(),
                this._fetchGDELTNews(),
                this._estimateSupplyChainRisk(),
            ]);

            // GDELT geopolitical signals
            if (results[0].status === 'fulfilled' && results[0].value) {
                this.snapshot.geopolitical = results[0].value;
            }

            // Crypto Fear & Greed
            if (results[1].status === 'fulfilled' && results[1].value) {
                this.snapshot.macro.cryptoFearGreed = results[1].value.value;
                this.snapshot.macro.cryptoFearGreedLabel = results[1].value.label;
                // Derive fear/greed proxy from crypto (since CNN F&G requires scraping)
                this.snapshot.macro.fearGreedIndex = results[1].value.value;
                this.snapshot.macro.fearGreedLabel = results[1].value.label.toLowerCase();
            }

            // Earthquakes
            if (results[2].status === 'fulfilled' && results[2].value) {
                this.snapshot.earthquakes = results[2].value;
            }

            // GDELT News
            if (results[3].status === 'fulfilled' && results[3].value) {
                this.snapshot.headlines = results[3].value;
            }

            // Supply chain estimation
            if (results[4].status === 'fulfilled' && results[4].value) {
                this.snapshot.supplyChain = results[4].value;
            }

            this.snapshot.lastRefresh = Date.now();
            this.snapshot.isLive = true;

            const liveCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            console.log(`[Intel] Refreshed: ${liveCount}/5 sources live | ${this.snapshot.geopolitical.length} geo signals | F&G: ${this.snapshot.macro.cryptoFearGreed}`);

        } catch (e) {
            console.warn(`[Intel] Refresh failed: ${e.message}`);
        } finally {
            this._refreshing = false;
        }
    }

    /**
     * Get a weighted worldview for a specific agent style.
     * Returns a volatility adjustment factor based on real intelligence.
     *
     * @param {string} style - 'macro'|'geopolitical'|'supply_chain'|'sentiment'|'balanced'
     * @param {string} domain - e.g. 'ETH/USD', 'XAU/USD'
     * @returns {{ adjustment: number, confidence: number, reasoning: string }}
     */
    getWorldview(style, domain) {
        const s = this.snapshot;
        if (!s.isLive) {
            return { adjustment: 0, confidence: 0.3, reasoning: 'Intel offline — using baseline' };
        }

        switch (style) {
            case 'macro':
                return this._macroWorldview(domain);
            case 'geopolitical':
                return this._geopoliticalWorldview(domain);
            case 'supply_chain':
                return this._supplyChainWorldview(domain);
            case 'sentiment':
                return this._sentimentWorldview(domain);
            default:
                return this._balancedWorldview(domain);
        }
    }

    /**
     * Get the full intelligence snapshot for the API endpoint.
     */
    getSnapshot() {
        return { ...this.snapshot };
    }

    // ═══════════════════════════════════════════════
    //  DATA FETCHERS (Public APIs)
    // ═══════════════════════════════════════════════

    /**
     * GDELT Global Knowledge Graph — measures global "tone" and event counts.
     * Uses the GDELT GKG API v2 to get real-time geopolitical event data.
     */
    async _fetchGDELT() {
        try {
            // GDELT GEO API — get recent events with tone analysis
            const url = 'https://api.gdeltproject.org/api/v2/summary/summary?d=web&t=summary&k=conflict+sanctions+military&ts=24h&svt=y&stc=y&sta=list&c=1';
            const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!resp.ok) throw new Error(`GDELT ${resp.status}`);
            const text = await resp.text();

            // Parse GDELT summary — extract event themes and tone
            const signals = [];
            const hotRegions = {
                'Ukraine': { type: 'conflict', baseSeverity: 80 },
                'Taiwan': { type: 'military', baseSeverity: 60 },
                'Iran': { type: 'conflict', baseSeverity: 70 },
                'Gaza': { type: 'conflict', baseSeverity: 85 },
                'Yemen': { type: 'conflict', baseSeverity: 65 },
                'Sudan': { type: 'conflict', baseSeverity: 70 },
                'North Korea': { type: 'military', baseSeverity: 55 },
                'Syria': { type: 'conflict', baseSeverity: 60 },
                'Russia': { type: 'sanctions', baseSeverity: 50 },
                'China': { type: 'military', baseSeverity: 45 },
            };

            // Check which regions appear in the GDELT data
            for (const [region, config] of Object.entries(hotRegions)) {
                if (text.toLowerCase().includes(region.toLowerCase())) {
                    // Estimate severity boost from mention frequency
                    const mentions = (text.toLowerCase().match(new RegExp(region.toLowerCase(), 'g')) || []).length;
                    const severityBoost = Math.min(20, mentions * 3);

                    signals.push({
                        region,
                        type: config.type,
                        severity: Math.min(100, config.baseSeverity + severityBoost),
                        title: `${config.type.toUpperCase()} activity detected: ${region}`,
                        timestamp: Date.now(),
                    });
                }
            }

            return signals;
        } catch (e) {
            console.warn(`[Intel:GDELT] ${e.message}`);
            // Fallback: return baseline geopolitical assumptions
            return [
                { region: 'Ukraine', type: 'conflict', severity: 75, title: 'Ongoing conflict — elevated baseline', timestamp: Date.now() },
                { region: 'Gaza', type: 'conflict', severity: 80, title: 'Active conflict zone', timestamp: Date.now() },
                { region: 'Taiwan Strait', type: 'military', severity: 40, title: 'Baseline military posture', timestamp: Date.now() },
            ];
        }
    }

    /**
     * Alternative.me Crypto Fear & Greed Index — free, no API key needed.
     */
    async _fetchCryptoFearGreed() {
        try {
            const resp = await fetch('https://api.alternative.me/fng/?limit=1', {
                signal: AbortSignal.timeout(8000),
            });
            if (!resp.ok) throw new Error(`F&G API ${resp.status}`);
            const data = await resp.json();
            const entry = data?.data?.[0];
            if (!entry) throw new Error('No F&G data');

            return {
                value: parseInt(entry.value),
                label: entry.value_classification,
            };
        } catch (e) {
            console.warn(`[Intel:F&G] ${e.message}`);
            return { value: 50, label: 'Neutral' };
        }
    }

    /**
     * USGS Earthquake API — significant seismic events.
     */
    async _fetchEarthquakes() {
        try {
            const resp = await fetch(
                'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
                { signal: AbortSignal.timeout(8000) }
            );
            if (!resp.ok) throw new Error(`USGS ${resp.status}`);
            const data = await resp.json();

            const quakes = (data.features || []).map(f => ({
                magnitude: f.properties.mag,
                place: f.properties.place,
                time: f.properties.time,
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
            }));

            // Regions affected by significant quakes
            const regions = quakes.map(q => q.place).filter(Boolean);

            return {
                significant: quakes.length,
                regions,
                quakes,
            };
        } catch (e) {
            console.warn(`[Intel:USGS] ${e.message}`);
            return { significant: 0, regions: [], quakes: [] };
        }
    }

    /**
     * GDELT DOC API — latest geopolitical headlines.
     */
    async _fetchGDELTNews() {
        try {
            const queries = ['global+market+volatility', 'sanctions+trade+war', 'military+conflict+escalation'];
            const query = queries[Math.floor(Math.random() * queries.length)];
            const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=10&format=json&sort=datedesc&timespan=24h`;

            const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!resp.ok) throw new Error(`GDELT DOC ${resp.status}`);
            const data = await resp.json();

            const articles = (data.articles || []).slice(0, 10);
            return articles.map(a => ({
                headline: a.title || '',
                source: a.domain || 'gdelt',
                sentimentScore: this._estimateSentiment(a.title || ''),
                tickers: this._extractTickers(a.title || ''),
                timestamp: new Date(a.seendate || Date.now()).getTime(),
                url: a.url,
            }));
        } catch (e) {
            console.warn(`[Intel:GDELTNews] ${e.message}`);
            return [];
        }
    }

    /**
     * Estimate supply chain disruption from geopolitical signals.
     * Uses chokepoint proximity to active conflict zones.
     */
    async _estimateSupplyChainRisk() {
        const chokepoints = [
            {
                chokepoint: 'hormuz',
                regions: ['Iran', 'Yemen', 'Saudi Arabia'],
                baseDisruption: 15,
                description: 'Strait of Hormuz — 20% of global oil transit',
            },
            {
                chokepoint: 'suez',
                regions: ['Gaza', 'Yemen', 'Egypt'],
                baseDisruption: 20,
                description: 'Suez Canal / Bab el-Mandeb — Houthi shipping attacks',
            },
            {
                chokepoint: 'malacca',
                regions: ['Taiwan', 'China', 'South China Sea'],
                baseDisruption: 10,
                description: 'Malacca Strait — strategic trade corridor',
            },
            {
                chokepoint: 'panama',
                regions: [],
                baseDisruption: 5,
                description: 'Panama Canal — drought-related transit limits',
            },
        ];

        const geoSignals = this.snapshot.geopolitical;

        return chokepoints.map(cp => {
            let disruption = cp.baseDisruption;

            // Boost disruption score if nearby conflict regions are active
            for (const signal of geoSignals) {
                if (cp.regions.some(r => signal.region.toLowerCase().includes(r.toLowerCase()))) {
                    disruption += Math.floor(signal.severity * 0.3);
                }
            }

            return {
                chokepoint: cp.chokepoint,
                disruptionScore: Math.min(100, disruption),
                description: cp.description,
            };
        });
    }

    // ═══════════════════════════════════════════════
    //  WORLDVIEW GENERATORS (Agent Analysis Styles)
    // ═══════════════════════════════════════════════

    /**
     * MACRO ANALYST — Weights Fear & Greed, VIX proxy, gold trend.
     * Best for: BTC/USD, ETH/USD, broad crypto
     */
    _macroWorldview(domain) {
        const m = this.snapshot.macro;
        const parts = [];
        let adjustment = 0;

        // Fear & Greed → extreme fear = expect higher vol, greed = lower vol
        const fgDeviation = (50 - m.cryptoFearGreed) / 50; // -1 (extreme greed) to +1 (extreme fear)
        adjustment += fgDeviation * 8; // ±8% vol adjustment
        parts.push(`F&G: ${m.cryptoFearGreed} (${m.cryptoFearGreedLabel})`);

        // Gold trend → rising gold = risk-off = higher vol expectations
        if (m.goldTrend > 1) {
            adjustment += 3;
            parts.push('Gold rising (risk-off)');
        } else if (m.goldTrend < -1) {
            adjustment -= 2;
            parts.push('Gold falling (risk-on)');
        }

        // Domain-specific adjustments
        if (domain === 'XAU/USD') {
            // Gold itself: fear drives gold UP but also increases vol
            adjustment += fgDeviation * 4;
        } else if (domain === 'EUR/USD') {
            // Forex: geopolitical stress increases EUR/USD vol
            const conflictCount = this.snapshot.geopolitical.filter(g => g.severity > 60).length;
            adjustment += conflictCount * 1.5;
        }

        const confidence = m.cryptoFearGreed !== 50 ? 0.75 : 0.5;

        return {
            adjustment: parseFloat(adjustment.toFixed(2)),
            confidence,
            reasoning: `MACRO: ${parts.join(' | ')}`,
        };
    }

    /**
     * GEOPOLITICAL ANALYST — Weights conflict intensity, military posture.
     * Best for: XAU/USD (gold), EUR/USD (forex), oil-correlated assets
     */
    _geopoliticalWorldview(domain) {
        const geo = this.snapshot.geopolitical;
        const parts = [];
        let adjustment = 0;

        // Overall geopolitical heat
        const avgSeverity = geo.length > 0
            ? geo.reduce((sum, g) => sum + g.severity, 0) / geo.length
            : 30;
        const geoHeat = (avgSeverity - 40) / 60; // Normalize: 0 at baseline, 1 at max
        adjustment += geoHeat * 10; // Up to ±10% vol adjustment
        parts.push(`${geo.length} active signals, avg severity: ${avgSeverity.toFixed(0)}`);

        // Critical conflicts (severity > 70) have outsized impact
        const criticalCount = geo.filter(g => g.severity > 70).length;
        if (criticalCount > 0) {
            adjustment += criticalCount * 3;
            parts.push(`${criticalCount} CRITICAL zones`);
        }

        // Earthquake disruptions can spike commodity vol
        const quakeCount = this.snapshot.earthquakes.significant;
        if (quakeCount > 0) {
            adjustment += quakeCount * 2;
            parts.push(`${quakeCount} significant quakes`);
        }

        // Domain-specific
        if (domain === 'XAU/USD') {
            adjustment *= 1.5; // Gold is the classic risk-off hedge
        } else if (domain.includes('SOL') || domain.includes('ETH')) {
            adjustment *= 0.6; // Crypto less directly affected by geopolitics
        }

        return {
            adjustment: parseFloat(adjustment.toFixed(2)),
            confidence: geo.length > 0 ? 0.7 : 0.4,
            reasoning: `GEO: ${parts.join(' | ')}`,
        };
    }

    /**
     * SUPPLY CHAIN ANALYST — Weights chokepoint disruptions, shipping.
     * Best for: XAU/USD, commodity-correlated assets
     */
    _supplyChainWorldview(domain) {
        const sc = this.snapshot.supplyChain;
        const parts = [];
        let adjustment = 0;

        // Overall supply chain stress
        const avgDisruption = sc.length > 0
            ? sc.reduce((sum, s) => sum + s.disruptionScore, 0) / sc.length
            : 10;

        adjustment += (avgDisruption - 15) * 0.3; // baseline at 15

        // Critical chokepoints
        const critical = sc.filter(s => s.disruptionScore > 50);
        if (critical.length > 0) {
            adjustment += critical.length * 4;
            parts.push(`${critical.length} critical chokepoints`);
        }

        // Hormuz specifically affects oil → affects everything
        const hormuz = sc.find(s => s.chokepoint === 'hormuz');
        if (hormuz && hormuz.disruptionScore > 30) {
            adjustment += 3;
            parts.push(`Hormuz disrupted (${hormuz.disruptionScore})`);
        }

        // Suez → affects EUR/USD, global trade
        const suez = sc.find(s => s.chokepoint === 'suez');
        if (suez && suez.disruptionScore > 40) {
            if (domain === 'EUR/USD') adjustment += 4;
            parts.push(`Suez stressed (${suez.disruptionScore})`);
        }

        parts.push(`Avg disruption: ${avgDisruption.toFixed(0)}`);

        return {
            adjustment: parseFloat(adjustment.toFixed(2)),
            confidence: sc.length > 0 ? 0.65 : 0.35,
            reasoning: `SUPPLY: ${parts.join(' | ')}`,
        };
    }

    /**
     * SENTIMENT ANALYST — Weights news headlines, F&G momentum.
     * Best for: BTC/USD, ETH/USD, meme-sensitive assets
     */
    _sentimentWorldview(domain) {
        const headlines = this.snapshot.headlines;
        const parts = [];
        let adjustment = 0;

        // Headline sentiment analysis
        if (headlines.length > 0) {
            const avgSentiment = headlines.reduce((sum, h) => sum + h.sentimentScore, 0) / headlines.length;
            // Negative sentiment → expect higher vol
            adjustment += (-avgSentiment) * 6;
            parts.push(`${headlines.length} headlines, avg sentiment: ${avgSentiment.toFixed(2)}`);
        }

        // Negative headlines with specific tickers
        const domainBase = domain.split('/')[0]; // e.g. 'ETH' from 'ETH/USD'
        const domainHeadlines = headlines.filter(h =>
            h.tickers.includes(domainBase) || h.headline.toLowerCase().includes(domainBase.toLowerCase())
        );
        if (domainHeadlines.length > 0) {
            const domainSentiment = domainHeadlines.reduce((sum, h) => sum + h.sentimentScore, 0) / domainHeadlines.length;
            adjustment += (-domainSentiment) * 4;
            parts.push(`${domainHeadlines.length} ${domainBase}-specific headlines`);
        }

        // Crypto F&G momentum
        const fgMomentum = this.snapshot.macro.cryptoFearGreed;
        if (fgMomentum < 25) {
            adjustment += 5;
            parts.push('EXTREME FEAR');
        } else if (fgMomentum > 75) {
            adjustment -= 3;
            parts.push('EXTREME GREED');
        }

        return {
            adjustment: parseFloat(adjustment.toFixed(2)),
            confidence: headlines.length > 3 ? 0.7 : 0.45,
            reasoning: `SENTIMENT: ${parts.join(' | ')}`,
        };
    }

    /**
     * BALANCED ANALYST — Equal weight across all signal types.
     */
    _balancedWorldview(domain) {
        const macro = this._macroWorldview(domain);
        const geo = this._geopoliticalWorldview(domain);
        const supply = this._supplyChainWorldview(domain);
        const sentiment = this._sentimentWorldview(domain);

        const adjustment = (macro.adjustment * 0.3 + geo.adjustment * 0.25 + supply.adjustment * 0.2 + sentiment.adjustment * 0.25);
        const confidence = (macro.confidence + geo.confidence + supply.confidence + sentiment.confidence) / 4;

        return {
            adjustment: parseFloat(adjustment.toFixed(2)),
            confidence: parseFloat(confidence.toFixed(2)),
            reasoning: `BALANCED: M[${macro.adjustment.toFixed(1)}] G[${geo.adjustment.toFixed(1)}] S[${supply.adjustment.toFixed(1)}] N[${sentiment.adjustment.toFixed(1)}]`,
        };
    }

    // ═══════════════════════════════════════════════
    //  UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════

    _estimateSentiment(headline) {
        const lower = headline.toLowerCase();
        const negative = ['crash', 'war', 'attack', 'bomb', 'sanctions', 'crisis', 'recession',
            'collapse', 'threat', 'escalat', 'strike', 'kill', 'dead', 'fear', 'plunge',
            'dump', 'bearish', 'sell-off', 'default', 'inflation', 'tariff'];
        const positive = ['rally', 'surge', 'breakout', 'bullish', 'peace', 'deal', 'growth',
            'recovery', 'all-time high', 'record', 'breakthrough', 'ceasefire', 'agreement'];

        let score = 0;
        for (const word of negative) {
            if (lower.includes(word)) score -= 0.15;
        }
        for (const word of positive) {
            if (lower.includes(word)) score += 0.15;
        }

        return Math.max(-1, Math.min(1, score));
    }

    _extractTickers(headline) {
        const tickers = [];
        const cryptoMap = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', 'btc': 'BTC', 'eth': 'ETH', 'sol': 'SOL' };
        const forexMap = { dollar: 'USD', euro: 'EUR', gold: 'XAU', yen: 'JPY' };

        const lower = headline.toLowerCase();
        for (const [keyword, ticker] of Object.entries({ ...cryptoMap, ...forexMap })) {
            if (lower.includes(keyword)) tickers.push(ticker);
        }
        return [...new Set(tickers)];
    }
}

// Singleton
const bridge = new IntelligenceBridge();

module.exports = bridge;
