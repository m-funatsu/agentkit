import { test, expect } from '@playwright/test';

test.describe('テンプレートページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/templates');
    await page.waitForSelector('[data-testid="templates-page"]');
  });

  test('ページが正しくレンダリングされる', async ({ page }) => {
    await expect(page.getByTestId('templates-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('テンプレートライブラリ');
  });

  test('8個以上のテンプレートカードが表示される', async ({ page }) => {
    const cards = page.getByTestId('template-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('カテゴリフィルターが表示される', async ({ page }) => {
    await expect(page.getByTestId('category-filter')).toBeVisible();
    await expect(page.getByTestId('filter-all')).toBeVisible();
  });

  test('カテゴリフィルターでテンプレートをフィルタリングできる', async ({ page }) => {
    const allCount = await page.getByTestId('template-card').count();

    // Click on a specific category
    await page.getByTestId('filter-billing').click();
    const filteredCount = await page.getByTestId('template-card').count();
    expect(filteredCount).toBeLessThan(allCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Click back to all
    await page.getByTestId('filter-all').click();
    const resetCount = await page.getByTestId('template-card').count();
    expect(resetCount).toBe(allCount);
  });

  test('各テンプレートに難易度バッジが表示される', async ({ page }) => {
    const badges = page.getByTestId('difficulty-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('テンプレートを使うボタンからエディタへ遷移', async ({ page }) => {
    await page.getByTestId('use-template-btn').first().click();
    await expect(page).toHaveURL(/\/editor\?template=/);
    await expect(page.getByTestId('editor-page')).toBeVisible();
  });
});
