import { test, expect } from '@playwright/test';

test.describe('ダッシュボードページ', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure demo data is seeded
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard-page"]');
  });

  test('ページが正しくレンダリングされる', async ({ page }) => {
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ダッシュボード');
  });

  test('統計カードが表示される', async ({ page }) => {
    await expect(page.getByTestId('stats-section')).toBeVisible();
    const cards = page.getByTestId('stat-card');
    await expect(cards).toHaveCount(4);
  });

  test('デモエージェントカードが表示される', async ({ page }) => {
    const agentCards = page.getByTestId('agent-card');
    const count = await agentCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('エージェントのステータスを切り替えできる', async ({ page }) => {
    const firstToggle = page.getByTestId('toggle-status-btn').first();
    await expect(firstToggle).toBeVisible();
    const initialText = await firstToggle.textContent();
    await firstToggle.click();
    // After toggle, the text should have changed
    const newText = await page.getByTestId('toggle-status-btn').first().textContent();
    expect(newText).not.toBe(initialText);
  });

  test('新規作成ボタンからエディタへ遷移', async ({ page }) => {
    await page.getByTestId('create-agent-btn').click();
    await expect(page).toHaveURL('/editor');
  });

  test('エージェントを削除できる', async ({ page }) => {
    const initialCount = await page.getByTestId('agent-card').count();
    // Accept the default behavior (no dialog confirmation in this implementation)
    await page.getByTestId('delete-agent-btn').first().click();
    const newCount = await page.getByTestId('agent-card').count();
    expect(newCount).toBe(initialCount - 1);
  });
});
