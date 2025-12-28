const { test, expect } = require('@playwright/test');

test('audio player starts a playback attempt', async ({ page }) => {
  await page.goto('/main.html');
  await expect(page.locator('#playButton')).toBeVisible();
  await page.click('#playButton');

  const bufferingMessage = page.locator('#bufferingMessage');
  await expect(bufferingMessage).toBeVisible();
  await expect(bufferingMessage).toContainText(/Starting|Loading|Reconnecting/i);
});
