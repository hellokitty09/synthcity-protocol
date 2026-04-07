const CycleManager = require('./cycle-manager');

function testLogic() {
    console.log('--- Testing Consensus API Logic ---');
    const cm = new CycleManager();
    cm.submitPrediction('A', 82.5, 's1');
    cm.submitPrediction('B', 88.0, 's2');
    cm.submitPrediction('C', 15.0, 's3');
    
    cm.reputations.set('A', 95);
    cm.reputations.set('B', 80);
    cm.reputations.set('C', 10);

    let totalW = 0;
    let totalR = 0;
    for (const [addr, data] of cm.predictions.entries()) {
        const repo = cm.getReputation(addr);
        console.log(`Agent ${addr}: Pred ${data.prediction}, Rep ${repo}`);
        totalW += data.prediction * repo;
        totalR += repo;
    }
    const result = totalW / totalR;
    console.log(`\nCalculated Weighted Consensus: ${result.toFixed(2)}`);
    
    // Manual calculation: (82.5*95 + 88*80 + 15*10) / (95+80+10) = 81.23
    if (result.toFixed(2) === '81.23') {
        console.log('✓ PASSED: Weighted consensus is mathematically correct.');
    } else {
        console.log(`✖ FAILURE: Expected 81.23, got ${result.toFixed(2)}`);
        process.exit(1);
    }
}

testLogic();
