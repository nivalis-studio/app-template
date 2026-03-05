import { expect, test } from '@playwright/test';

const TITLE_PATTERN = /create next app/i;
const HTTP_OK = 200;

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(TITLE_PATTERN);
});

test('landing page has main content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
});

test('sign-in page is reachable', async ({ page }) => {
  const response = await page.goto('/sign-in');
  expect(response?.status()).toBe(HTTP_OK);
  await expect(page.locator('body')).toBeVisible();
});
