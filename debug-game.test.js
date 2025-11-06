const { test, expect } = require('@playwright/test');

test.describe('Vampire Survivor Game Debugging', () => {
  test('comprehensive game state debugging', async ({ page }) => {
    // Set up console log collection
    const logs = [];
    const errors = [];
    const warnings = [];

    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      logs.push(logEntry);

      if (msg.type() === 'error') {
        errors.push(logEntry);
      } else if (msg.type() === 'warning') {
        warnings.push(logEntry);
      }

      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    });

    // Set up page error handler
    page.on('pageerror', error => {
      console.error('[PAGE ERROR]:', error.message);
      errors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Navigate to the game
    console.log('\n=== STEP 1: Navigating to game ===');
    await page.goto('http://localhost:8001/index.html');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    console.log('\n=== STEP 2: Taking initial screenshot ===');
    await page.screenshot({ path: 'debug-initial.png', fullPage: true });
    console.log('✓ Initial screenshot saved as debug-initial.png');

    // Check canvas visibility
    console.log('\n=== STEP 3: Checking canvas element ===');
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    const canvasBox = await canvas.boundingBox();
    console.log('Canvas dimensions:', canvasBox);

    // Get initial game state
    console.log('\n=== STEP 4: Getting initial game state ===');
    const initialState = await page.evaluate(() => {
      return {
        gameState: window.gameState,
        canvas: {
          width: document.getElementById('gameCanvas').width,
          height: document.getElementById('gameCanvas').height
        },
        enemies: window.enemies ? window.enemies.length : 'undefined',
        projectiles: window.projectiles ? window.projectiles.length : 'undefined',
        weapons: window.weapons ? window.weapons.length : 'undefined',
        player: window.player ? {
          x: window.player.x,
          y: window.player.y,
          health: window.player.health,
          level: window.player.level
        } : 'undefined'
      };
    });
    console.log('Initial state:', JSON.stringify(initialState, null, 2));

    // Click start button
    console.log('\n=== STEP 5: Clicking start button ===');
    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    console.log('✓ Start button clicked');

    // Wait 3 seconds
    console.log('\n=== STEP 6: Waiting 3 seconds for game to run ===');
    await page.waitForTimeout(3000);

    // Take post-start screenshot
    console.log('\n=== STEP 7: Taking post-start screenshot ===');
    await page.screenshot({ path: 'debug-after-start.png', fullPage: true });
    console.log('✓ Post-start screenshot saved as debug-after-start.png');

    // Get detailed game state after start
    console.log('\n=== STEP 8: Getting detailed game state after start ===');
    const afterStartState = await page.evaluate(() => {
      const state = {
        gameState: window.gameState,
        gameTime: window.gameTime,
        score: window.score,
        canvas: {
          width: document.getElementById('gameCanvas').width,
          height: document.getElementById('gameCanvas').height
        },
        player: window.player ? {
          x: window.player.x,
          y: window.player.y,
          width: window.player.width,
          height: window.player.height,
          health: window.player.health,
          maxHealth: window.player.maxHealth,
          level: window.player.level,
          exp: window.player.exp,
          speed: window.player.speed
        } : null,
        enemies: {
          count: window.enemies ? window.enemies.length : 0,
          list: window.enemies ? window.enemies.slice(0, 3).map(e => ({
            x: e.x,
            y: e.y,
            health: e.health,
            speed: e.speed
          })) : []
        },
        projectiles: {
          count: window.projectiles ? window.projectiles.length : 0,
          list: window.projectiles ? window.projectiles.slice(0, 3).map(p => ({
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            lifetime: p.lifetime
          })) : []
        },
        weapons: {
          count: window.weapons ? window.weapons.length : 0,
          list: window.weapons ? window.weapons.map(w => ({
            name: w.name,
            damage: w.damage,
            cooldown: w.cooldown,
            count: w.count,
            canFire: w.canFire()
          })) : []
        },
        loops: {
          enemySpawnTimer: window.enemySpawnTimer,
          enemySpawnInterval: window.enemySpawnInterval,
          lastTime: window.lastTime
        }
      };
      return state;
    });
    console.log('After-start state:', JSON.stringify(afterStartState, null, 2));

    // Check canvas rendering
    console.log('\n=== STEP 9: Checking canvas rendering ===');
    const canvasData = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check if canvas has any non-background pixels
      let nonBackgroundPixels = 0;
      const backgroundColor = { r: 26, g: 26, b: 46 }; // #1a1a2e

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Check if pixel is different from background
        if (a > 0 && (Math.abs(r - backgroundColor.r) > 10 ||
                      Math.abs(g - backgroundColor.g) > 10 ||
                      Math.abs(b - backgroundColor.b) > 10)) {
          nonBackgroundPixels++;
        }
      }

      return {
        totalPixels: data.length / 4,
        nonBackgroundPixels,
        hasDrawing: nonBackgroundPixels > 0,
        percentDrawn: (nonBackgroundPixels / (data.length / 4) * 100).toFixed(2)
      };
    });
    console.log('Canvas rendering analysis:', canvasData);

    // Wait another 2 seconds and check again
    console.log('\n=== STEP 10: Waiting 2 more seconds for enemy spawn ===');
    await page.waitForTimeout(2000);

    const finalState = await page.evaluate(() => {
      return {
        gameState: window.gameState,
        gameTime: window.gameTime,
        enemies: window.enemies ? window.enemies.length : 0,
        projectiles: window.projectiles ? window.projectiles.length : 0,
        enemySpawnTimer: window.enemySpawnTimer,
        firstEnemy: window.enemies && window.enemies.length > 0 ? {
          x: window.enemies[0].x,
          y: window.enemies[0].y,
          health: window.enemies[0].health
        } : null
      };
    });
    console.log('Final state (5s after start):', JSON.stringify(finalState, null, 2));

    // Generate summary report
    console.log('\n=== DEBUGGING SUMMARY ===');
    console.log('Console Logs:', logs.length);
    console.log('Errors:', errors.length);
    console.log('Warnings:', warnings.length);

    if (errors.length > 0) {
      console.log('\n=== ERRORS FOUND ===');
      errors.forEach((err, i) => {
        console.log(`Error ${i + 1}:`, err);
      });
    }

    console.log('\n=== GAME STATE ANALYSIS ===');
    console.log('✓ Canvas is visible:', canvasBox !== null);
    console.log('✓ Game state changed:', initialState.gameState, '→', afterStartState.gameState);
    console.log('✓ Player initialized:', afterStartState.player !== null);
    console.log('✓ Weapons initialized:', afterStartState.weapons.count > 0);
    console.log('✗ Enemies spawned:', finalState.enemies > 0 ? 'YES' : 'NO');
    console.log('✗ Projectiles created:', afterStartState.projectiles.count > 0 ? 'YES' : 'NO');
    console.log('✓ Canvas rendering:', canvasData.hasDrawing ? 'YES' : 'NO');
    console.log('  - Non-background pixels:', canvasData.nonBackgroundPixels);
    console.log('  - Percent drawn:', canvasData.percentDrawn + '%');

    // Root cause analysis
    console.log('\n=== ROOT CAUSE ANALYSIS ===');
    if (finalState.enemies === 0) {
      console.log('⚠️  ISSUE: No enemies spawned after 5 seconds');
      console.log('   Enemy spawn timer:', finalState.enemySpawnTimer);
      console.log('   Enemy spawn interval:', afterStartState.loops.enemySpawnInterval);
      console.log('   Game time:', finalState.gameTime, 'seconds');

      if (finalState.enemySpawnTimer < afterStartState.loops.enemySpawnInterval) {
        console.log('   → Timer has not reached spawn interval yet');
      }
    }

    if (afterStartState.projectiles.count === 0 && finalState.enemies === 0) {
      console.log('⚠️  ISSUE: No projectiles fired');
      console.log('   Weapon fire condition: enemies.length === 0');
      console.log('   → Weapons only fire when enemies exist');
      console.log('   → This is expected if no enemies have spawned');
    }

    // Save all logs to file
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalLogs: logs.length,
        errors: errors.length,
        warnings: warnings.length
      },
      states: {
        initial: initialState,
        afterStart: afterStartState,
        final: finalState
      },
      canvas: canvasData,
      logs,
      errors,
      warnings
    };

    console.log('\n=== Full report saved (see test output) ===');
    console.log(JSON.stringify(report, null, 2));
  });
});
