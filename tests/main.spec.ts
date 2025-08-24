import { test, expect } from '@playwright/test';
import path from 'path';

const mainHtml = 'file://' + path.join(__dirname, '..', 'main.html');

test.describe('Main page functionality', () => {
  test('plays music when play button is clicked', async ({ page }) => {
    await page.goto(mainHtml);
    const playButton = page.getByRole('button', { name: 'Play' });
    await playButton.click();
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const audio = document.getElementById('audioPlayer') as HTMLAudioElement | null;
        return audio ? !audio.paused : false;
      });
    }).toBe(true);
  });

  test('search input accepts text', async ({ page }) => {
    await page.goto(mainHtml);
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('PWA install button is present', async ({ page }) => {
    await page.goto(mainHtml);
    const installButton = page.getByRole('button', { name: 'Install Àríyò AI', hidden: true });
    await expect(installButton).toHaveCount(1);
  });
});

