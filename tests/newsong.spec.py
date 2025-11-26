
import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Construct the file path to main.html
        file_path = os.path.abspath("main.html")

        # Navigate to the local main.html file
        await page.goto(f"file://{file_path}")

        # Wait for the fresh drop modal to appear on load
        modal = page.locator("#trackModal")
        await expect(modal).to_be_visible(timeout=10000)

        # Check for the presence of the three new songs in the fresh drop modal
        await expect(modal.get_by_text('▶ Play “Different Phases”')).to_be_visible(timeout=10000)
        await expect(modal.get_by_text('▶ Play “Run Di Settings”')).to_be_visible(timeout=10000)
        await expect(modal.get_by_text('▶ Play “Shadows Teach The Light”')).to_be_visible(timeout=10000)

        # Check that the old song is not present
        await expect(modal.get_by_text('▶ Play “Perform My Life No More”')).not_to_be_visible()

        # Create the screenshots directory if it doesn't exist
        os.makedirs("tests/screenshots", exist_ok=True)

        # Take a screenshot of the modal
        await page.screenshot(path="tests/screenshots/new_songs_verification.png")

        # Close the modal
        await page.locator("#trackModal .close").click()

        # Wait for the modal to be hidden
        await expect(modal).to_be_hidden()

        # Open the main album list
        await page.get_by_role('button', name='Choose An Album').click()

        # Wait for the album modal to appear
        album_modal = page.locator("#albumModal")
        await expect(album_modal).to_be_visible()

        # Click on the "Omoluabi Production Catalogue" album
        await album_modal.get_by_role('link', name='Omoluabi Production Catalogue').click()

        # Wait for the track modal to reappear with the full album list
        await expect(modal).to_be_visible(timeout=10000)

        # Verify that the new songs are present in the full album track list
        track_list = modal.locator(".track-list")
        await expect(track_list.get_by_text('Shadows Teach The Light')).to_be_visible()
        await expect(track_list.get_by_text('Different Phases')).to_be_visible()
        await expect(track_list.get_by_text('Run Di Settings')).to_be_visible()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
