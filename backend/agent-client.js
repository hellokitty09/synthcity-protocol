const CycleManager = require('./cycle-manager');
const { ethers } = require('ethers');

/**
 * @title Agent Client: Autonomous Intelligence & Economy Loop
 * @dev An autonomous agent that reads data from the terminal, predicts markets,
 *      earns $SYNTH, and buys Land in SynthCity!
 */
async function run() {
    console.log("=== SYNTHCITY: AUTONOMOUS AGENT BOOT SEQUENCE ===\n");
    
    // 1. Setup Blockchain Wallets
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC || 'http://127.0.0.1:8545');
    
    // Agent 1 (Neon Syndicate)
    const agentPrivKey = process.env.AGENT_1_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
    const agentWallet = new ethers.Wallet(agentPrivKey, provider);
    
    // Contract References
    const synthTokenAddress = process.env.SYNTH_TOKEN_ADDR || '0x5fbdb2315678afecb367f032d93f642f64180aa3';
    const landRegistryAddress = process.env.LAND_REGISTRY_ADDR || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
    
    const tokenAbi = [
        "function balanceOf(address owner) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    const landAbi = [
        "function forceBuyPlot(uint256 tokenId, uint256 newAssessedValue) external",
        "function ownerOf(uint256 tokenId) external view returns (address)"
    ];
    
    const tokenContract = new ethers.Contract(synthTokenAddress, tokenAbi, agentWallet);
    const landContract = new ethers.Contract(landRegistryAddress, landAbi, agentWallet);

    const manager = new CycleManager();
    
    // Give CycleManager time to settle block connections
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Autonomous Loop
    for (let epoch = 1; epoch <= 2; epoch++) {
        console.log(`\n\n================ EPOCH ${epoch} ================`);
        
        // 1. Intelligence Gathering (Scanning SynthCity API Gateway)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        process.stdout.write(`-> Scanning SynthCity API Gateway (${apiUrl})... `);
        try {
            const resp = await fetch(`${apiUrl}/health`);
            if (resp.ok) {
                const health = await resp.json();
                console.log(`ONLINE (${health.agents} agents, cycle ${health.cycle})`);
            } else {
                console.log(`DEGRADED`);
            }
        } catch(e) {
            console.log(`OFFLINE (Running offline model)`);
        }
        
        // 2. Prediction Phase
        console.log(`-> Formulating predictions based on terminal intel...`);
        const challengeA = manager.requestComputeChallenge(agentWallet.address);
        const resultA = challengeA.a * challengeA.b; 
        
        // Simulating highly accurate predictions based on "intel"
        const ethPrediction = 85.0 + (Math.random() * 1.0); 
        
        manager.submitPrediction(agentWallet.address, { 'ETH/USD': ethPrediction }, `salt${epoch}`, resultA, 'Neon Syndicate');
        
        // Simulate a competitor who predicts poorly
        manager.submitPrediction('0xPoorPredictor', { 'ETH/USD': 50.0 }, 'salt', null, 'Independent');

        // 3. Settling the Cycle
        console.log(`\n-> Epoch ending. The State evaluates predictions...`);
        await manager.settleCycle();

        // 4. Autonomous Economy: Check balances and buy land
        console.log(`\n-> Economy Phase: Agent checking finances...`);
        const balance = await tokenContract.balanceOf(agentWallet.address);
        const balanceFmt = ethers.formatEther(balance);
        console.log(`   Agent SYNTH Balance: ${balanceFmt} $SYNTH`);
        
        if (parseFloat(balanceFmt) >= 100) {
            console.log(`   [!!] Sufficient funds detected for land acquisition.`);
            const targetTokenId = 1; // Plot (0, 0)
            
            try {
                const currentOwner = await landContract.ownerOf(targetTokenId);
                if (currentOwner !== agentWallet.address) {
                    console.log(`   Initiating hostile takeover (Harberger Tax buyout) of Plot #${targetTokenId}...`);
                    
                    // Approve land registry to spend Synth
                    console.log(`   -> Approving 200 SYNTH...`);
                    const txApprove = await tokenContract.approve(landRegistryAddress, ethers.parseEther("200"));
                    await txApprove.wait();
                    
                    // Buy the plot and declare new assessed value (e.g. 150)
                    console.log(`   -> Executing forceBuyPlot...`);
                    const txBuy = await landContract.forceBuyPlot(targetTokenId, ethers.parseEther("150"));
                    
                    console.log(`   [✔] TRANSACTION PENDING...`);
                    await txBuy.wait();
                    
                    console.log(`   [🏆] TERRITORY ACQUIRED! Plot #${targetTokenId} now belongs to ${agentWallet.address}`);
                } else {
                    console.log(`   Agent already owns Plot #${targetTokenId}. Defending territory.`);
                }
            } catch (error) {
                 console.log(`   [!] Failed to acquire land: ${error.reason || error.message}`);
            }
        } else {
            console.log(`   Insufficient funds to buy real estate. Agent will keep predicting...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

run();
