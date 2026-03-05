import { test, expect } from '@playwright/test';

test.describe('ログページ', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and go to dashboard first to seed demo data
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard-page"]');
    // Now navigate to logs
    await page.goto('/logs');
    await page.waitForSelector('[data-testid="logs-page"]');
  });

  test('ページが正しくレンダリングされる', async ({ page }) => {
    await expect(page.getByTestId('logs-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('実行ログ');
  });

  test('ログ統計が表示される', async ({ page }) => {
    await expect(page.getByTestId('log-stats')).toBeVisible();
  });

  test('ステータスフィルターが表示される', async ({ page }) => {
    await expect(page.getByTestId('status-filter')).toBeVisible();
    await expect(page.getByTestId('filter-all')).toBeVisible();
    await expect(page.getByTestId('filter-completed')).toBeVisible();
    await expect(page.getByTestId('filter-failed')).toBeVisible();
  });

  test('実行カードが表示される', async ({ page }) => {
    const cards = page.getByTestId('execution-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('実行カードをクリックして詳細を展開できる', async ({ page }) => {
    await page.getByTestId('execution-toggle').first().click();
    await expect(page.getByTestId('execution-details').first()).toBeVisible();
  });

  test('ステータスフィルターで実行ログをフィルタリングできる', async ({ page }) => {
    const allCount = await page.getByTestId('execution-card').count();

    // Filter by completed only
    await page.getByTestId('filter-completed').click();
    const completedCount = await page.getByTestId('execution-card').count();
    expect(completedCount).toBeLessThanOrEqual(allCount);

    // Reset
    await page.getByTestId('filter-all').click();
    const resetCount = await page.getByTestId('execution-card').count();
    expect(resetCount).toBe(allCount);
  });
});
