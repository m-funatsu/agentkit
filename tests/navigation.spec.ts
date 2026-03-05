import { test, expect } from '@playwright/test';

test.describe('ナビゲーション', () => {
  test('各ナビゲーションタブから正しいページへ遷移する', async ({ page }) => {
    await page.goto('/');

    // Dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();

    // Templates
    await page.getByTestId('nav-templates').click();
    await expect(page).toHaveURL('/templates');
    await expect(page.getByTestId('templates-page')).toBeVisible();

    // Editor
    await page.getByTestId('nav-editor').click();
    await expect(page).toHaveURL('/editor');
    await expect(page.getByTestId('editor-page')).toBeVisible();

    // Logs
    await page.getByTestId('nav-logs').click();
    await expect(page).toHaveURL('/logs');
    await expect(page.getByTestId('logs-page')).toBeVisible();

    // Home
    await page.getByTestId('nav-home').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();
  });

  test('アクティブなタブがハイライトされる', async ({ page }) => {
    await page.goto('/dashboard');
    const dashboardLink = page.getByTestId('nav-dashboard');
    await expect(dashboardLink).toHaveClass(/text-indigo-600/);
    const homeLink = page.getByTestId('nav-home');
    await expect(homeLink).toHaveClass(/text-gray-500/);
  });
});
