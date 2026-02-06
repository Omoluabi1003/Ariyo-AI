const { test, expect } = require('@playwright/test');

test('radio modal and track selection do not leave scroll locked', async ({ page }) => {
  await page.goto('/main.html');
  await page.getByRole('button', { name: /radio stations/i }).click();

  const radioModal = page.locator('#radioModal');
  await expect(radioModal).toBeVisible();
  await page.locator('#radioModal .close').click();
  await expect(radioModal).toBeHidden();

  await page.getByRole('button', { name: /choose a track/i }).click();
  const firstTrack = page.locator('.track-item').first();
  await expect(firstTrack).toBeVisible({ timeout: 10000 });
  await firstTrack.click();

  const bodyUnlocked = await page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    const htmlStyle = getComputedStyle(document.documentElement);
    return bodyStyle.overflow !== 'hidden' && htmlStyle.overflow !== 'hidden';
  });
  expect(bodyUnlocked).toBe(true);
});
