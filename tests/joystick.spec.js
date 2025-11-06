const { test, expect } = require('@playwright/test');

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 375, height: 667 }
});

test.describe('バーチャルジョイスティックテスト', () => {
  test.beforeEach(async ({ page }) => {
    // ローカルファイルを開く
    await page.goto('file://' + __dirname.replace(/\\/g, '/').replace('/tests', '') + '/index.html');

    // ゲームスタートボタンをクリック
    await page.click('#startBtn');
    await page.waitForTimeout(500);

    // グローバル変数を公開
    await page.evaluate(() => {
      window.testPlayer = player;
      window.testJoystick = joystick;
    });
  });

  test('ジョイスティックがタッチで表示される', async ({ page }) => {
    // キャンバスの中心位置を取得
    const canvas = await page.locator('#gameCanvas');
    const box = await canvas.boundingBox();

    // タッチ開始をシミュレート
    await page.touchscreen.tap(box.x + 100, box.y + 100);

    // スクリーンショットを撮影
    await page.screenshot({ path: 'tests/screenshots/joystick-active.png' });

    // ジョイスティックが描画されていることを確認（JavaScriptで確認）
    const joystickActive = await page.evaluate(() => {
      return window.testJoystick && window.testJoystick.active;
    });

    expect(joystickActive).toBe(true);
  });

  test('ジョイスティックでプレイヤーが移動する', async ({ page }) => {
    const canvas = await page.locator('#gameCanvas');
    const box = await canvas.boundingBox();

    // 初期位置を取得
    const initialPos = await page.evaluate(() => {
      return { x: window.testPlayer.x, y: window.testPlayer.y };
    });

    // タッチを開始
    const startX = box.x + 100;
    const startY = box.y + 100;

    // タッチスクリーンでドラッグをシミュレート
    await page.touchscreen.tap(startX, startY);
    await page.waitForTimeout(100);

    // 右方向にドラッグ
    await page.evaluate(async ({ x, y }) => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();

      // touchstart
      const touchStart = new Touch({
        identifier: 0,
        target: canvas,
        clientX: x,
        clientY: y,
      });

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [touchStart],
        cancelable: true,
        bubbles: true
      });
      canvas.dispatchEvent(touchStartEvent);

      // touchmove (右方向)
      await new Promise(resolve => setTimeout(resolve, 50));

      const touchMove = new Touch({
        identifier: 0,
        target: canvas,
        clientX: x + 40,
        clientY: y,
      });

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [touchMove],
        cancelable: true,
        bubbles: true
      });
      canvas.dispatchEvent(touchMoveEvent);

      // 移動を待つ
      await new Promise(resolve => setTimeout(resolve, 500));

      // touchend
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [touchMove],
        cancelable: true,
        bubbles: true
      });
      canvas.dispatchEvent(touchEndEvent);
    }, { x: startX - box.x, y: startY - box.y });

    // スクリーンショット撮影
    await page.screenshot({ path: 'tests/screenshots/joystick-moved.png' });

    // 移動後の位置を取得
    const finalPos = await page.evaluate(() => {
      return { x: window.testPlayer.x, y: window.testPlayer.y };
    });

    // プレイヤーが右に移動したことを確認
    expect(finalPos.x).toBeGreaterThan(initialPos.x);
  });

  test('ジョイスティックの描画要素を確認', async ({ page }) => {
    const canvas = await page.locator('#gameCanvas');
    const box = await canvas.boundingBox();

    // タッチを開始
    await page.evaluate(async ({ x, y }) => {
      const canvas = document.getElementById('gameCanvas');

      const touch = new Touch({
        identifier: 0,
        target: canvas,
        clientX: x,
        clientY: y,
      });

      const touchEvent = new TouchEvent('touchstart', {
        touches: [touch],
        cancelable: true,
        bubbles: true
      });
      canvas.dispatchEvent(touchEvent);

      await new Promise(resolve => setTimeout(resolve, 100));
    }, { x: box.x + 150, y: box.y + 150 });

    // スクリーンショットを撮影
    await page.screenshot({ path: 'tests/screenshots/joystick-visual.png' });

    // ジョイスティックのプロパティを確認
    const joystickProps = await page.evaluate(() => {
      return {
        active: window.testJoystick.active,
        baseX: window.testJoystick.baseX,
        baseY: window.testJoystick.baseY,
        radius: window.testJoystick.radius,
        stickRadius: window.testJoystick.stickRadius,
        maxDistance: window.testJoystick.maxDistance
      };
    });

    expect(joystickProps.active).toBe(true);
    expect(joystickProps.radius).toBe(60);
    expect(joystickProps.stickRadius).toBe(25);
    expect(joystickProps.maxDistance).toBe(40);
  });

  test('キーボード操作も引き続き機能する', async ({ page }) => {
    // 初期位置を取得
    const initialPos = await page.evaluate(() => {
      return { x: window.testPlayer.x, y: window.testPlayer.y };
    });

    // 右キー(D)を押す
    await page.keyboard.down('d');
    await page.waitForTimeout(500);
    await page.keyboard.up('d');

    // 移動後の位置を取得
    const finalPos = await page.evaluate(() => {
      return { x: window.testPlayer.x, y: window.testPlayer.y };
    });

    // プレイヤーが右に移動したことを確認
    expect(finalPos.x).toBeGreaterThan(initialPos.x);
  });
});
