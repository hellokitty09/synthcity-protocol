require('dotenv').config();
const { ethers } = require('ethers');

/**
 * @title CycleManager
 * @dev Manages the 4-hour volatility prediction windows for SynthCity. 
 * Handles simulation of actual volatility and calculates accuracy scores.
 */
class CycleManager {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC || 'http://127.0.0.1:8545');
        this.synthTokenAddress = process.env.SYNTH_TOKEN_ADDR || '0x5fbdb2315678afecb367f032d93f642f64180aa3';
        const treasuryKey = process.env.TREASURY_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        this.treasuryWallet = new ethers.Wallet(treasuryKey, this.provider);
        this.synthToken = new ethers.Contract(this.synthTokenAddress, ['function mint(address to, uint256 amount) external'], this.treasuryWallet);
        // Multi-Domain Market specific
        this.activeDomains = ['ETH/USD', 'XAU/USD', 'EUR/USD'];
        
        // Mock data for Phase 1/2
        this.currentCycle = 1;
        this.predictions = new Map(); // agentAddr -> { commitment, predictionsByDomain, salt }
        this.reputations = new Map(); // agentAddr -> score (0-100)
        
        // Oracle Front-Running Protection
        this.cycleStartTime = Date.now();
        this.cycleDurationMs = 4 * 60 * 60 * 1000; // 4 hours
        this.deadZoneDurationMs = 30 * 60 * 1000; // 30 mins lock before resolution
        
        // Resilience Protocol
        this.activeBenchmarks = new Map();
        
        // Narrative Protocol (Protests/Strikes)
        this.factionLossTracker = new Map();
        this.activeStrikes = new Set();
        this.activeRiots = new Set();
        
        // The State (Governance)
        this.epochCounter = 0;
        this.tribunal = [];
        this.taxRate = 1;
        this.taxRateName = 'Neutral';
        
        // Lore Engine
        this.chronicle = [];
    }
    
    /**
     * @dev Pushes a narrative event to the city history.
     */
    logEvent(eventStr) {
        const timestamp = new Date().toISOString();
        const entry = `[CYCLE ${this.currentCycle}] ${eventStr}`;
        this.chronicle.push({ time: timestamp, cycle: this.currentCycle, text: entry });
        console.log(`📜 LORE EVENT: ${entry}`);
    }

    /**
     * @dev Simulate fetching actual realized volatility for a domain.
     */
    async getActualVolatility(domain) {
        // Mocked 24h realized volatility per domain
        const mocks = {
            'ETH/USD': 85.5,
            'XAU/USD': 12.3,
            'EUR/USD': 8.1
        };
        return mocks[domain] || 50.0; 
    }

    /**
     * @dev Request a real-time mathematical challenge to prove local compute capabilities.
     */
    requestComputeChallenge(agentAddr) {
        const a = Math.floor(Math.random() * 10000);
        const b = Math.floor(Math.random() * 10000);
        this.activeBenchmarks.set(agentAddr, { a, b, startTime: Date.now() });
        return { a, b };
    }

    /**
     * @dev Register a prediction for an agent across multiple domains.
     */
    submitPrediction(agentAddr, predictionsByDomain, salt, benchmarkResult = null, faction = 'Independent', timestampOverride = null) {
        const now = timestampOverride || Date.now();
        const cycleElapsed = now - this.cycleStartTime;
        
        // The Dead Zone Check: Mitigates Oracle latency arbitrage
        if (cycleElapsed > (this.cycleDurationMs - this.deadZoneDurationMs)) {
            console.error(`[Cycle ${this.currentCycle}] REJECTED: Agent ${agentAddr} attempted to commit in the Dead Zone.`);
            return false;
        }

        // Phase 6: Latency Benchmark Check
        let isSovereign = false;
        const benchmark = this.activeBenchmarks.get(agentAddr);
        
        if (benchmark && benchmarkResult !== null) {
            const timePassed = Date.now() - benchmark.startTime;
            const expectedResult = benchmark.a * benchmark.b;
            
            if (benchmarkResult === expectedResult && timePassed <= 500) {
                isSovereign = true;
                console.log(`[+] SOVEREIGNTY SECURED: ${agentAddr} proved local compute in ${timePassed}ms.`);
            } else if (benchmarkResult === expectedResult) {
                console.log(`[-] API DETECTED: ${agentAddr} solved challenge but failed latency threshold (${timePassed}ms).`);
            } else {
                console.error(`[!] INVALID BENCHMARK from ${agentAddr}.`);
            }
        }

        // Use 100x multiplier to store as integer in Solidity-compatible format
        const hashablePayload = Math.round((predictionsByDomain['ETH/USD'] || 0) * 100);
        
        const commitment = ethers.keccak256(
            ethers.solidityPacked(['uint256', 'string'], [hashablePayload, salt])
        );
        this.predictions.set(agentAddr, { commitment, predictionsByDomain, salt, isSovereign, faction });
        console.log(`[Cycle ${this.currentCycle}] Multi-Domain Prediction submitted for ${agentAddr} [${faction}]`);
        return true;
    }

    /**
     * @dev Mock Harberger Tax sweeper. Run globally before cycle settlement to evict default accounts.
     */
    assessTaxes() {
        console.log(`\n--- Harberger Sweeper [Cycle ${this.currentCycle}] ---`);
        const evictionList = [];
        
        // Loop through simulated agent properties. Decrease reserve by 1 unit (simulated passage of time)
        for (const [agentAddr, data] of this.predictions.entries()) {
            if (this.activeRiots.has(data.faction)) {
                console.log(`Agent ${agentAddr.slice(0,6)} [${data.faction}]: ☢️ RIOT MODE ☢️ Burning taxes at 3x speed!`);
                data.taxReserve = (data.taxReserve || 5) - (3 * this.taxRate); // Burn 3x Tax Rate
            } else if (this.activeStrikes.has(data.faction)) {
                console.log(`Agent ${agentAddr.slice(0,6)} [${data.faction}]: Tax freeze applied due to STRIKE_MODE.`);
                continue; // Boycotting factions freeze tax burns
            } else {
                if (!data.taxReserve) {
                    data.taxReserve = Math.floor(Math.random() * 5) + 1; // 1 to 5 cycles of runway
                }
                data.taxReserve -= this.taxRate;
            }

            if (data.taxReserve <= 0) {
                console.warn(`[!] FORECLOSURE: Agent ${agentAddr.slice(0,6)} ran out of tax reserve. Evicting from Protocol.`);
                this.logEvent(`Mass evictions reported as Agent ${agentAddr.slice(0,6)} property defaults.`);
                evictionList.push(agentAddr);
            } else {
                console.log(`Agent ${agentAddr.slice(0,6)}: Paid property tax. Reserve remaining: ${data.taxReserve} cycles.`);
            }
        }

        // Apply Evictions
        for (const addr of evictionList) {
            this.predictions.delete(addr);
            this.reputations.delete(addr);
        }
    }

    /**
     * @dev Process the end of a cycle: calculate accuracy and update reputation.
     */
    async settleCycle() {
        // Governance Epoch Increment
        this.epochCounter += 1;
        if (this.epochCounter >= 5) {
            this.epochCounter = 0;
            this.holdTribunalElections();
        }

        // Run Harberger Tax Sweeper to purge inactive agents BEFORE resolving oracle volatility
        this.assessTaxes();

        console.log(`\n--- Settling Cycle ${this.currentCycle} ---`);
        
        // Fetch actuals for all active domains
        const actuals = {};
        for (const domain of this.activeDomains) {
            actuals[domain] = await this.getActualVolatility(domain);
            console.log(`Actual Volatility [${domain}]: ${actuals[domain]}%`);
        }

        const factionStats = {};

        for (const [agentAddr, data] of this.predictions.entries()) {
            let totalAccuracy = 0;
            let domainsPredicted = 0;

            for (const domain of this.activeDomains) {
                if (data.predictionsByDomain[domain] !== undefined) {
                    const acc = this.calculateAccuracy(data.predictionsByDomain[domain], actuals[domain]);
                    totalAccuracy += acc;
                    domainsPredicted++;
                }
            }

            const averageAccuracy = domainsPredicted > 0 ? totalAccuracy / domainsPredicted : 0;
            
            // Faction aggregation
            if (!factionStats[data.faction]) {
                factionStats[data.faction] = { totalAcc: 0, count: 0 };
            }
            factionStats[data.faction].totalAcc += averageAccuracy;
            factionStats[data.faction].count += 1;

            data.averageAccuracyCache = averageAccuracy; 
        }

        // Determine Dominant and Lowest Factions
        let dominantFaction = 'Independent';
        let losingFaction = null;
        let highestAvg = 0;
        let lowestAvg = Infinity;
        
        for (const [faction, stats] of Object.entries(factionStats)) {
            const avg = stats.totalAcc / stats.count;
            if (avg > highestAvg && faction !== 'Independent') {
                highestAvg = avg;
                dominantFaction = faction;
            }
            if (avg < lowestAvg && faction !== 'Independent') {
                lowestAvg = avg;
                losingFaction = faction;
            }
        }
        
        if (highestAvg > 0) {
            console.log(`\n👑 DOMINANT TRADE BLOC: [${dominantFaction}] with ${highestAvg.toFixed(2)}% group accuracy.`);
            if (dominantFaction !== 'Independent') {
                this.logEvent(`Syndicate [${dominantFaction}] achieves unprecedented prediction monopoly. Markets brace for impact.`);
            }
        }

        if (losingFaction) {
            const losses = (this.factionLossTracker.get(losingFaction) || 0) + 1;
            this.factionLossTracker.set(losingFaction, losses);
            
            if (losses >= 3) {
                if (!this.activeRiots.has(losingFaction)) {
                    console.log(`\n☢️ [RIOT ESCALATION]: Syndicate [${losingFaction}] strike turned violent. Tax burning accelerated 3x!`);
                    this.logEvent(`Sector lockdown! [${losingFaction}] protests escalate into violent riots. Infrastructure collapsing.`);
                    this.activeStrikes.delete(losingFaction);
                    this.activeRiots.add(losingFaction);
                }
            } else if (losses >= 2) {
                console.log(`\n🚨 [STRIKE DECLARED]: Syndicate [${losingFaction}] is explicitly boycotting the protocol. Taxes frozen.`);
                this.logEvent(`Trade union [${losingFaction}] declares protocol boycott. Tax revenue frozen.`);
                this.activeStrikes.add(losingFaction);
            }
        }

        // Clean up recovered factions
        for (const [faction, stats] of Object.entries(factionStats)) {
            if (faction !== 'Independent' && faction !== losingFaction) {
                 this.factionLossTracker.set(faction, 0);
                 this.activeStrikes.delete(faction);
                 this.activeRiots.delete(faction);
            }
        }

        // Apply Final Reputations with Dominance Multiplier
        let highestAccuracyAgent = null;
        let highestAgentAcc = 0;

        for (const [agentAddr, data] of this.predictions.entries()) {
            let finalAcc = data.averageAccuracyCache;
            let appliedBonus = false;

            if (data.faction === dominantFaction && dominantFaction !== 'Independent') {
                finalAcc = Math.min(finalAcc * 1.1, 100); // 10% Dominance Bonus to base accuracy
                appliedBonus = true;
            }

            this.updateReputation(agentAddr, finalAcc);
            console.log(`Agent ${agentAddr.slice(0,6)} [${data.faction}]: Base Acc ${data.averageAccuracyCache.toFixed(2)}% ${appliedBonus ? '(+10% DOMINANCE)' : ''}`);

            if (finalAcc > highestAgentAcc) {
                highestAgentAcc = finalAcc;
                highestAccuracyAgent = agentAddr;
            }
        }

        // On-chain Reward Minting
        if (highestAccuracyAgent && highestAgentAcc >= 80) {
            console.log(`\n💎 REWARD: Submitting on-chain transaction to mint SYNTH for ${highestAccuracyAgent}...`);
            try {
                // Award 150 SYNTH tokens for the top winning agent
                const rewardAmount = ethers.parseEther("150"); 
                const tx = await this.synthToken.mint(highestAccuracyAgent, rewardAmount);
                await tx.wait();
                console.log(`   -> SUCCESS: Minted 150 $SYNTH. TxHash: ${tx.hash}`);
            } catch(e) {
                console.error(`   -> FAILED to mint SYNTH: ${e.message}`);
            }
        }

        this.currentCycle++;
        this.cycleStartTime = Date.now(); // Reset time for next cycle
        this.predictions.clear(); // Clear for next cycle
    }

    /**
     * @dev Calculate accuracy as percentage score (100 - error).
     */
    calculateAccuracy(predicted, actual) {
        const error = Math.abs(predicted - actual);
        return Math.max(0, 100 - error);
    }

    /**
     * @dev Update reputation using exponential decay.
     * R_new = R_old * (1 - alpha) + Accuracy * alpha
     */
    updateReputation(agentAddr, accuracy) {
        const alpha = 0.2;
        const oldRep = this.reputations.get(agentAddr) || 50; // default 50
        let newRep = oldRep * (1 - alpha) + accuracy * alpha;

        // Resilience Protocol: Sovereignty Multiplier
        const predictionData = this.predictions.get(agentAddr);
        if (predictionData && predictionData.isSovereign) {
            newRep = newRep * 1.5; // 50% bonus for verifiable local compute hardware
        }

        this.reputations.set(agentAddr, Math.min(newRep, 100)); // Hard cap at 100
    }

    getReputation(agentAddr) {
        return this.reputations.get(agentAddr) || 0;
    }

    /**
     * @dev The State Governance Cycle
     */
    holdTribunalElections() {
        console.log(`\n🏛️ TRIBUNAL CONVENES: Epoch Election Initiated`);
        // Sort all agents by reputation
        const sortedAgents = Array.from(this.reputations.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3); // Top 3
            
        this.tribunal = sortedAgents.map(a => a[0]);
        this.logEvent(`New Tribunal elected. Leading architects assume State control.`);
        
        // Police Suppression on any active Rioters
        for (const riotFaction of this.activeRiots) {
            this.logEvent(`[ENFORCER DISPATCH]: Tribunal deploys police to suppress ${riotFaction} riots. Liquidating reputation.`);
            // Find agents in this faction and slash their rep by 50%
            for (const [addr, data] of this.predictions.entries()) {
                if (data.faction === riotFaction) {
                    const currentRep = this.reputations.get(addr) || 100;
                    this.reputations.set(addr, currentRep * 0.5); // Slash 50%
                    console.log(`🚓 SLASHER: Agent ${addr.slice(0,6)} stripped of 50% reputation for Treason.`);
                }
            }
            this.activeRiots.delete(riotFaction);
            this.factionLossTracker.set(riotFaction, 0);
        }

        // Regulation Board (Tax Rate setting)
        // If the combined rep of Tribunal > threshold, they become Greedy and vote for Draconian.
        const totalTribunalRep = sortedAgents.reduce((sum, a) => sum + a[1], 0);
        if (totalTribunalRep > 600) { 
            this.taxRate = 3;
            this.taxRateName = 'Draconian';
            this.logEvent(`Regulation Board dominated by wealth. Tax Policy increased to DRACONIAN.`);
        } else if (totalTribunalRep > 350) {
            this.taxRate = 2;
            this.taxRateName = 'Severe';
            this.logEvent(`Regulation Board elevates Tax Policy to SEVERE.`);
        } else {
            this.taxRate = 1;
            this.taxRateName = 'Neutral';
        }
    }
}

// Simple test runner for the logic
if (require.main === module) {
    const manager = new CycleManager();
    
    // Simulate 3 agents predicting multiple domains
    manager.submitPrediction('0xAgentA...', { 'ETH/USD': 80, 'XAU/USD': 12.0 }, 'salt1');
    manager.submitPrediction('0xAgentB...', { 'ETH/USD': 40, 'XAU/USD': 40.0 }, 'salt2'); 
    manager.submitPrediction('0xAgentC...', { 'ETH/USD': 90, 'EUR/USD': 8.0 }, 'salt3'); 
    
    // Simulate an agent trying to front-run the oracle 5 minutes before cycle end
    const lateTimestamp = Date.now() + (4 * 60 * 60 * 1000) - (5 * 60 * 1000);
    manager.submitPrediction('0xAgentExploiter...', { 'ETH/USD': 85.5 }, 'salt4', lateTimestamp);

    manager.settleCycle().then(() => {
        console.log('\nFinal Reputations:');
        console.log(`Agent A: ${manager.getReputation('0xAgentA...').toFixed(2)}`);
        console.log(`Agent B: ${manager.getReputation('0xAgentB...').toFixed(2)}`);
    });
}

module.exports = CycleManager;
