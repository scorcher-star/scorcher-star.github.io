// Console Test Script for Game Verification
// Paste this into the browser console after the game has been running for ~3 seconds

(function testGame() {
    console.log('=== GAME VERIFICATION TEST ===\n');

    const results = [];

    // Test 1: Game State Exists
    if (typeof gameState !== 'undefined') {
        results.push({ test: 'Game State', status: '✅ PASS', details: 'gameState object found' });

        // Test 2: Game is Playing
        if (gameState.isPlaying === true) {
            results.push({ test: 'Game Playing', status: '✅ PASS', details: 'Game is active' });
        } else {
            results.push({ test: 'Game Playing', status: '❌ FAIL', details: 'Game is not playing' });
        }

        // Test 3: Elapsed Time
        const time = gameState.elapsedTime || 0;
        if (time > 0) {
            results.push({
                test: 'Time Display',
                status: time >= 2 && time <= 4 ? '✅ PASS' : '⚠️ WARN',
                details: `Current time: ${time.toFixed(2)}s`
            });
        } else {
            results.push({ test: 'Time Display', status: '❌ FAIL', details: 'Time not updating' });
        }

        // Test 4: Enemies Present
        const enemyCount = gameState.enemies?.length || 0;
        if (enemyCount > 0) {
            results.push({
                test: 'Enemies',
                status: '✅ PASS',
                details: `${enemyCount} enemies active`
            });

            // Show enemy details
            console.log('\nEnemy Details:');
            gameState.enemies.slice(0, 3).forEach((enemy, i) => {
                console.log(`  Enemy ${i + 1}: x=${enemy.x.toFixed(0)}, y=${enemy.y.toFixed(0)}, ` +
                    `size=${enemy.size}, health=${enemy.health}`);
            });
        } else {
            results.push({ test: 'Enemies', status: '❌ FAIL', details: 'No enemies found' });
        }

        // Test 5: Projectiles Present
        const projectileCount = gameState.projectiles?.length || 0;
        if (projectileCount > 0) {
            results.push({
                test: 'Projectiles',
                status: '✅ PASS',
                details: `${projectileCount} projectiles active`
            });

            // Show projectile details
            console.log('\nProjectile Details:');
            gameState.projectiles.slice(0, 3).forEach((proj, i) => {
                console.log(`  Projectile ${i + 1}: x=${proj.x.toFixed(0)}, y=${proj.y.toFixed(0)}, ` +
                    `speed=${proj.speed}`);
            });
        } else {
            results.push({
                test: 'Projectiles',
                status: '⚠️ WARN',
                details: 'No projectiles yet (may not have fired)'
            });
        }

        // Test 6: Canvas Content
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = Array.from(imageData.data).some(v => v !== 0);

            if (hasContent) {
                results.push({ test: 'Canvas Content', status: '✅ PASS', details: 'Canvas has visual content' });
            } else {
                results.push({ test: 'Canvas Content', status: '❌ FAIL', details: 'Canvas is blank' });
            }
        } else {
            results.push({ test: 'Canvas Element', status: '❌ FAIL', details: 'Canvas not found' });
        }

        // Test 7: Animation Running
        if (gameState.animationId) {
            results.push({ test: 'Animation Loop', status: '✅ PASS', details: 'Animation frame ID exists' });
        } else {
            results.push({ test: 'Animation Loop', status: '❌ FAIL', details: 'Animation not running' });
        }

    } else {
        results.push({ test: 'Game State', status: '❌ FAIL', details: 'gameState not found' });
    }

    // Display Results
    console.log('\n=== TEST RESULTS ===\n');
    const statusTable = results.map(r => ({
        Test: r.test,
        Status: r.status,
        Details: r.details
    }));
    console.table(statusTable);

    const passCount = results.filter(r => r.status.includes('✅')).length;
    const failCount = results.filter(r => r.status.includes('❌')).length;
    const warnCount = results.filter(r => r.status.includes('⚠️')).length;

    console.log(`\nSummary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings\n`);

    if (failCount === 0) {
        console.log('🎉 All critical tests passed! Game is functioning properly.\n');
    } else {
        console.log('⚠️ Some tests failed. Please review the issues above.\n');
    }

    return {
        summary: { passed: passCount, failed: failCount, warnings: warnCount },
        results: results,
        gameState: typeof gameState !== 'undefined' ? {
            isPlaying: gameState.isPlaying,
            elapsedTime: gameState.elapsedTime,
            enemyCount: gameState.enemies?.length || 0,
            projectileCount: gameState.projectiles?.length || 0
        } : null
    };
})();
