import { expect, test } from '@playwright/test';

const TITLE_PATTERN = /create next app/i;

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(TITLE_PATTERN);
});

test('landing page has main content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
});

test('sign-in page is reachable', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.locator('form')).toBeVisible({ timeout: 15_000 });
});
