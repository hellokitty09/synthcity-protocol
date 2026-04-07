/**
 * ═══════════════════════════════════════════════════════════
 *  OLLAMA AGENT BRAIN — Local LLM-Powered Prediction Engine
 *  Each agent runs its own sovereign LLM to analyze intelligence
 *  and generate volatility predictions. True BYOC (Bring Your
 *  Own Compute) autonomous agents.
 * ═══════════════════════════════════════════════════════════
 *
 *  Architecture:
 *    Intelligence Bridge → Signal Snapshot
 *    Agent Brain → formats prompt with domain context + signals
 *    Ollama → returns structured volatility prediction
 *    API Server → submits prediction to CycleManager
 *
 *  Models:
 *    - gemma3:4b  → primary reasoning (Neon Syndicate, Iron Bank)
 *    - qwen3:1.7b → fast consensus (Obsidian Core, independents)
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const REQUEST_TIMEOUT_MS = 30_000;

// Track model availability
let ollamaAvailable = false;
let availableModels = [];

/**
 * Check which models are available in Ollama.
 */
async function checkOllama() {
    try {
        const resp = await fetch(`${OLLAMA_URL}/api/tags`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok) throw new Error(`Ollama ${resp.status}`);
        const data = await resp.json();
        availableModels = (data.models || []).map(m => m.name);
        ollamaAvailable = availableModels.length > 0;
        console.log(`[OllamaBrain] Available models: ${availableModels.join(', ') || 'none'}`);
        return ollamaAvailable;
    } catch (e) {
        ollamaAvailable = false;
        availableModels = [];
        console.warn(`[OllamaBrain] Ollama not reachable: ${e.message}`);
        return false;
    }
}

/**
 * Select the best model for an agent's style.
 */
function selectModel(style) {
    // Priority: prefer gemma3 for reasoning, qwen3 for speed
    const modelPreference = {
        'macro':        ['gemma3:4b', 'qwen3:1.7b'],
        'geopolitical': ['gemma3:4b', 'qwen3:1.7b'],
        'supply_chain': ['qwen3:1.7b', 'gemma3:4b'],
        'sentiment':    ['qwen3:1.7b', 'gemma3:4b'],
        'balanced':     ['gemma3:4b', 'qwen3:1.7b'],
    };

    const prefs = modelPreference[style] || ['gemma3:4b', 'qwen3:1.7b'];
    for (const model of prefs) {
        if (availableModels.some(m => m.startsWith(model.split(':')[0]))) {
            // Return the exact installed model name
            return availableModels.find(m => m.startsWith(model.split(':')[0])) || model;
        }
    }

    // Fallback: use whatever is available
    return availableModels[0] || 'gemma3:4b';
}

/**
 * Build the analysis prompt for an agent.
 *
 * @param {string} agentName - Agent faction name
 * @param {string} style - Analysis style
 * @param {string} domain - e.g. 'ETH/USD'
 * @param {Object} priceData - Current price, change24h, volatility
 * @param {Object} worldview - From intelligence-bridge.getWorldview()
 * @param {Object} snapshot - Full intelligence snapshot
 * @returns {string} The prompt
 */
function buildPrompt(agentName, style, domain, priceData, worldview, snapshot) {
    const geoSummary = snapshot.geopolitical.slice(0, 5).map(g =>
        `  - ${g.region}: ${g.type} (severity ${g.severity}/100)`
    ).join('\n') || '  - No active signals';

    const headlineSummary = snapshot.headlines.slice(0, 5).map(h =>
        `  - "${h.headline}" [sentiment: ${h.sentimentScore.toFixed(2)}]`
    ).join('\n') || '  - No recent headlines';

    const supplyChainSummary = snapshot.supplyChain.map(s =>
        `  - ${s.chokepoint}: disruption ${s.disruptionScore}/100`
    ).join('\n') || '  - No disruptions';

    const quakeInfo = snapshot.earthquakes.significant > 0
        ? `  ${snapshot.earthquakes.significant} significant earthquakes this week`
        : '  No significant seismic activity';

    return `You are "${agentName}", an autonomous AI trading agent specializing in ${style} analysis.

TASK: Predict the annualized volatility (%) and your market bias for ${domain} across three distinct timeframes:
1. shortTerm (Next 1 hour - Tactical)
2. midTerm (Next 24 hours - Daily outlook)
3. longTerm (Next 30 days - Strategic forecast)

CURRENT MARKET DATA:
  Price: $${priceData.price}
  24h Change: ${priceData.change24h}%
  Current Measured Volatility: ${priceData.volatility}%

INTELLIGENCE BRIEFING:
Geopolitical Signals:
${geoSummary}

Market Sentiment:
  Crypto Fear & Greed: ${snapshot.macro.cryptoFearGreed}/100 (${snapshot.macro.cryptoFearGreedLabel})
  Intelligence Assessment: ${worldview.reasoning}
  Signal Adjustment: ${worldview.adjustment > 0 ? '+' : ''}${worldview.adjustment}%

Headlines:
${headlineSummary}

Supply Chain:
${supplyChainSummary}

Seismic:
${quakeInfo}

INSTRUCTIONS:
1. Analyze the intelligence briefing through your ${style} lens.
2. Consider how the signals affect ${domain} differently in the short vs long term.
3. Output ONLY a valid JSON object matching the exact structure below. DO NOT include any markdown formatting like \`\`\`json.

EXPECTED JSON SCHEMA:
{
  "shortTerm": {"volatility": <number>, "bias": "<bullish|bearish|neutral>", "reasoning": "<one sentence reasoning>"},
  "midTerm": {"volatility": <number>, "bias": "<bullish|bearish|neutral>", "reasoning": "<one sentence reasoning>"},
  "longTerm": {"volatility": <number>, "bias": "<bullish|bearish|neutral>", "reasoning": "<one sentence reasoning>"}
}`;
}

/**
 * Query Ollama for a prediction.
 *
 * @param {string} model - Model name
 * @param {string} prompt - The analysis prompt
 * @returns {Promise<{volatility: number, confidence: number, bias: string, reasoning: string} | null>}
 */
async function queryOllama(model, prompt) {
    try {
        const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.3,
                    num_predict: 600,
                    top_p: 0.9,
                },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!resp.ok) throw new Error(`Ollama generate ${resp.status}`);
        const data = await resp.json();
        const text = data.response || '';

        // Extract JSON from response (LLMs sometimes wrap in markdown)
        const jsonMatch = text.match(/\{[\s\S]*?"shortTerm"[\s\S]*?\}/);
        let parsed = null;
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn(`[OllamaBrain] JSON Parse error:`, e.message);
            }
        } 
        
        if (!parsed || !parsed.shortTerm || typeof parsed.shortTerm.volatility !== 'number') {
            console.warn(`[OllamaBrain] Invalid or missing schema in response: ${text.slice(0, 100)}`);
            return null;
        }

        // Sanity bounds and defaults
        const sanitizeTier = (tier) => ({
            volatility: Math.max(0, Math.min(200, tier?.volatility || 50)),
            bias: tier?.bias || 'neutral',
            reasoning: tier?.reasoning || 'Standard LLM projection applied.',
        });

        parsed.shortTerm = sanitizeTier(parsed.shortTerm);
        parsed.midTerm = sanitizeTier(parsed.midTerm);
        parsed.longTerm = sanitizeTier(parsed.longTerm);

        return parsed;
    } catch (e) {
        console.warn(`[OllamaBrain] Query failed (${model}): ${e.message}`);
        return null;
    }
}

/**
 * Generate a full prediction for a domain using an agent's LLM brain.
 *
 * @param {string} agentName - Faction name
 * @param {string} style - 'macro'|'geopolitical'|'supply_chain'|'sentiment'|'balanced'
 * @param {string} domain - e.g. 'ETH/USD'
 * @param {Object} priceData - { price, change24h, volatility }
 * @param {Object} intelBridge - The IntelligenceBridge instance
 * @returns {Promise<{volatility: number, confidence: number, bias: string, reasoning: string, model: string, usedLLM: boolean}>}
 */
async function generatePrediction(agentName, style, domain, priceData, intelBridge) {
    const worldview = intelBridge.getWorldview(style, domain);
    const snapshot = intelBridge.getSnapshot();

    // If Ollama is available, use LLM reasoning
    if (ollamaAvailable) {
        const model = selectModel(style);
        const prompt = buildPrompt(agentName, style, domain, priceData, worldview, snapshot);

        console.log(`[OllamaBrain] ${agentName} analyzing ${domain} via ${model}...`);
        const result = await queryOllama(model, prompt);

        if (result) {
            console.log(`[OllamaBrain] ${agentName} → ${domain}: vol=${result.volatility}%, bias=${result.bias}, conf=${result.confidence}`);
            return {
                ...result,
                model,
                usedLLM: true,
            };
        }
    }

    // Fallback: use intelligence bridge worldview (rule-based)
    const baseVol = priceData.volatility || 50;
    const adjustedVol = Math.max(1, baseVol + worldview.adjustment);

    console.log(`[AgentBrain] ${agentName} → ${domain}: vol=${adjustedVol.toFixed(2)}% (rule-based, adj=${worldview.adjustment})`);

    const fallbackBias = worldview.adjustment > 2 ? 'bearish' : worldview.adjustment < -2 ? 'bullish' : 'neutral';
    
    return {
        volatility: parseFloat(adjustedVol.toFixed(2)),
        confidence: worldview.confidence,
        bias: fallbackBias,
        reasoning: worldview.reasoning,
        model: 'rule-based',
        usedLLM: false,
        shortTerm: { volatility: parseFloat(adjustedVol.toFixed(2)), bias: fallbackBias, reasoning: worldview.reasoning },
        midTerm: { volatility: parseFloat((adjustedVol * 1.5).toFixed(2)), bias: fallbackBias, reasoning: 'Projected amplification of current signals.' },
        longTerm: { volatility: parseFloat((adjustedVol * 2.0).toFixed(2)), bias: 'neutral', reasoning: 'Mean reversion heavily expected beyond 30 days.' }
    };
}

module.exports = {
    checkOllama,
    selectModel,
    generatePrediction,
    isAvailable: () => ollamaAvailable,
    getModels: () => [...availableModels],
};
