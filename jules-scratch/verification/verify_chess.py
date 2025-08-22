import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            await page.goto(f"file://{os.getcwd()}/chess.html", wait_until="networkidle")

            # Make a move for white (e.g., e2 to e4)
            await page.click('.square-e2')
            await page.click('.square-e4')

            # Wait for the AI to make a move
            await page.wait_for_timeout(1000)

            await page.screenshot(path="jules-scratch/verification/chess-verification.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    import os
    asyncio.run(main())
