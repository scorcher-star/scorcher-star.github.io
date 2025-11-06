"""
Test script to verify the game fix using Playwright
"""
from playwright.sync_api import sync_playwright
import time
import sys

def test_game():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # Store console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))

        # Navigate to the game
        print("Navigating to http://localhost:8001/index.html...")
        page.goto("http://localhost:8001/index.html")
        page.wait_for_load_state("networkidle")

        # Take initial screenshot
        print("Taking initial screenshot...")
        page.screenshot(path="c:/Users/okada-k/vansava/scorcher-star.github.io/screenshots/game_initial.png")

        # Click start button
        print("Clicking start button...")
        start_button = page.locator("button:has-text('Start')")
        if start_button.is_visible():
            start_button.click()
            print("Start button clicked!")
        else:
            print("Start button not found!")

        # Wait 3 seconds
        print("Waiting 3 seconds for game to run...")
        time.sleep(3)

        # Take screenshot after 3 seconds
        print("Taking screenshot after 3 seconds...")
        page.screenshot(path="c:/Users/okada-k/vansava/scorcher-star.github.io/screenshots/game_after_3sec.png")

        # Get canvas element and check its state
        canvas = page.locator("canvas")
        canvas_count = canvas.count()
        print(f"\nCanvas elements found: {canvas_count}")

        # Print console logs
        print("\n=== Console Logs ===")
        for log in console_logs:
            print(log)

        # Check for enemies and projectiles in the game state
        game_state = page.evaluate("""
            () => {
                return {
                    enemiesCount: window.gameState?.enemies?.length || 0,
                    projectilesCount: window.gameState?.projectiles?.length || 0,
                    isPlaying: window.gameState?.isPlaying || false,
                    elapsedTime: window.gameState?.elapsedTime || 0
                };
            }
        """)

        print("\n=== Game State ===")
        print(f"Is Playing: {game_state['isPlaying']}")
        print(f"Elapsed Time: {game_state['elapsedTime']:.2f}s")
        print(f"Enemies Count: {game_state['enemiesCount']}")
        print(f"Projectiles Count: {game_state['projectilesCount']}")

        # Verification
        print("\n=== Verification Results ===")
        issues = []

        if not game_state['isPlaying']:
            issues.append("❌ Game is not playing")
        else:
            print("✅ Game is playing")

        if game_state['elapsedTime'] < 2.5 or game_state['elapsedTime'] > 3.5:
            issues.append(f"⚠️ Time display may be incorrect: {game_state['elapsedTime']:.2f}s (expected ~3s)")
        else:
            print(f"✅ Time display is correct: {game_state['elapsedTime']:.2f}s")

        if game_state['enemiesCount'] == 0:
            issues.append("❌ No enemies found on canvas")
        else:
            print(f"✅ Enemies are visible: {game_state['enemiesCount']} enemies")

        if game_state['projectilesCount'] == 0:
            issues.append("⚠️ No projectiles found (may not have fired yet)")
        else:
            print(f"✅ Projectiles are firing: {game_state['projectilesCount']} projectiles")

        if issues:
            print("\n=== Remaining Issues ===")
            for issue in issues:
                print(issue)
        else:
            print("\n✅ All verifications passed! Game is functioning properly.")

        # Keep browser open for manual inspection
        print("\nBrowser will remain open for 5 seconds for manual inspection...")
        time.sleep(5)

        browser.close()

if __name__ == "__main__":
    try:
        test_game()
    except Exception as e:
        print(f"Error during testing: {e}")
        sys.exit(1)
