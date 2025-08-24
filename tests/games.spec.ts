import { test, expect } from '@playwright/test';
import path from 'path';

const root = path.join(__dirname, '..');

function fileUrl(relativePath: string) {
  return 'file://' + path.join(root, relativePath);
}

test('Connect Four game board renders', async ({ page }) => {
  await page.goto(fileUrl('connect-four.html'));
  await expect(page.locator('#game-title')).toHaveText('Ara Connect-4');
  await expect(page.locator('#board')).toBeVisible();
});

test('Picture puzzle controls render', async ({ page }) => {
  await page.goto(fileUrl('picture-game.html'));
  await expect(page.locator('#game-title')).toHaveText('Ara Puzzle');
  await expect(page.locator('#start-button')).toBeVisible();
});

test('Tetris canvas is visible', async ({ page }) => {
  await page.goto(fileUrl('tetris.html'));
  await expect(page.locator('#game-title')).toHaveText('Omoluabi Tetris');
  await expect(page.locator('#tetris')).toBeVisible();
});

test('Word search grid container exists', async ({ page }) => {
  await page.goto(fileUrl('word-search.html'));
  await expect(page.getByRole('heading', { name: 'Word Search Game' })).toBeVisible();
  await expect(page.locator('#game')).toBeVisible();
});

