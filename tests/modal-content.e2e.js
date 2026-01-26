const { test, expect } = require('@playwright/test');

test('track modal and radio station list render content', async ({ page }) => {
  await page.goto('/main.html');

  await page.click('button[aria-label="Choose a track"]');
  const trackItems = page.locator('.track-list .track-item');
  await expect(trackItems.first()).toBeVisible({ timeout: 15000 });
  const trackCount = await trackItems.count();
  expect(trackCount).toBeGreaterThan(0);

  await page.click('button[aria-label="Close track list"]');

  await page.click('button[aria-label="Radio stations"]');
  const radioItems = page.locator('#nigeria-stations a');
  await expect(radioItems.first()).toBeVisible({ timeout: 15000 });
  const radioCount = await radioItems.count();
  expect(radioCount).toBeGreaterThan(0);
});
