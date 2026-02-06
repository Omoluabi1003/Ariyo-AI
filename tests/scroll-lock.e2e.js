const { test, expect } = require('@playwright/test');

const verifyScrollable = async (page, label) => {
  const canScroll = await page.evaluate(() => {
    const el = document.scrollingElement;
    if (!el) return false;
    if (el.scrollHeight <= el.clientHeight) return false;
    const start = el.scrollTop;
    el.scrollTop = start + 400;
    return el.scrollTop !== start;
  });
  expect(canScroll, label).toBeTruthy();
};

test('scroll stays enabled after track selection flows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/main.html');
  await expect(page.locator('.music-player')).toBeVisible();

  await page.click('button[aria-label="Choose a track"]');
  const firstTrack = page.locator('.track-list .track-item').first();
  await expect(firstTrack).toBeVisible({ timeout: 15000 });
  await firstTrack.click();
  await expect(page.locator('#trackModal')).toBeHidden();
  await verifyScrollable(page, 'after track list selection');

  await page.click('button[aria-label="Choose an album"]');
  const firstAlbum = page.locator('.album-list a').first();
  await expect(firstAlbum).toBeVisible({ timeout: 15000 });
  await firstAlbum.click();
  await expect(page.locator('#albumModal')).toBeHidden();
  await expect(page.locator('#trackModal')).toBeVisible();
  const albumTrack = page.locator('.track-list .track-item').first();
  await expect(albumTrack).toBeVisible({ timeout: 15000 });
  await albumTrack.click();
  await expect(page.locator('#trackModal')).toBeHidden();
  await verifyScrollable(page, 'after album selection');

  await page.fill('#searchInput', 'love');
  const searchOption = page.locator('.search-results .search-result[role="option"]').first();
  await expect(searchOption).toBeVisible({ timeout: 15000 });
  await searchOption.click();
  await expect(page.locator('#searchResults')).toBeHidden();
  await verifyScrollable(page, 'after search selection');
});
