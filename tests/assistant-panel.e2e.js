const { test, expect } = require('@playwright/test');

test.describe('Ask Ariyọ assistant edge panel', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens as a viewport-safe mobile sheet and closes from the backdrop', async ({ page }) => {
    await page.goto('/main.html');

    const panel = page.locator('#edgePanel');
    const backdrop = page.locator('#edgePanelBackdrop');

    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await page.getByRole('button', { name: 'Ask Ariyọ', exact: true }).first().click();

    await expect(panel).toHaveClass(/visible/);
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(
      page.getByRole('heading', { name: 'Good to see you. What would you like to discover?' }),
    ).toBeVisible();
    await expect(page.locator('#assistantPanelInput')).toBeVisible();
    await expect(backdrop).toHaveClass(/visible/);

    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(11);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(379);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);

    await backdrop.click({ position: { x: 4, y: 4 } });
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  test('opens from the floating trigger and keeps assistant commands functional', async ({ page }) => {
    await page.goto('/main.html');

    await page.getByRole('button', { name: 'Open Ask Ariyọ assistant' }).click();
    await page.locator('#assistantPanelInput').fill('Recommend focus music');
    await page.locator('#assistantPanelForm').getByRole('button', { name: 'Send command' }).click();

    await expect(page.locator('#assistantPanelResponse')).toContainText('MUSIC / FOCUS');
    await expect(page.locator('#edgePanelClose')).toBeVisible();
    await page.locator('#edgePanelClose').click();
    await expect(page.locator('#edgePanel')).toHaveAttribute('aria-hidden', 'true');
  });
});

test('opens as a bounded desktop drawer above the backdrop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/main.html');

  await page.getByRole('button', { name: 'Open Ask Ariyọ assistant' }).click();
  const panel = page.locator('#edgePanel');
  await expect(panel).toHaveCSS('right', '24px');
  const bounds = await panel.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds.width).toBeLessThanOrEqual(420);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1280);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
  await expect(panel).toHaveCSS('z-index', '100');
  await expect(page.locator('#edgePanelBackdrop')).toHaveCSS('z-index', '90');
  await expect(page.locator('#edgePanelClose')).toBeVisible();
});
