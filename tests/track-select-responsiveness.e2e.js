const { test, expect } = require('@playwright/test');

test('track selection shows loading quickly and keeps scroll available', async ({ page }) => {
  await page.goto('/main.html');
  await page.getByRole('button', { name: /choose a track/i }).click();

  const firstTrack = page.locator('.track-item').first();
  await expect(firstTrack).toBeVisible({ timeout: 10000 });

  const start = Date.now();
  await firstTrack.click();
  await page.waitForFunction(() => {
    const overlay = document.getElementById('bufferingOverlay');
    return Boolean(overlay && overlay.classList.contains('visible'));
  }, { timeout: 1500 });

  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(800);

  const modalHidden = await page.evaluate(() => {
    const modal = document.getElementById('trackModal');
    return modal ? getComputedStyle(modal).display === 'none' : true;
  });
  expect(modalHidden).toBe(true);

  const scrollWorks = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    const before = root.scrollTop;
    window.scrollTo(0, before + 200);
    return root.scrollTop > before;
  });
  expect(scrollWorks).toBe(true);
});
