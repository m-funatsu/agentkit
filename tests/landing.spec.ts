import { test, expect } from '@playwright/test';

test.describe('ランディングページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正しくレンダリングされる', async ({ page }) => {
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByTestId('hero-section')).toBeVisible();
    await expect(page.getByTestId('features-section')).toBeVisible();
  });

  test('ヒーローセクションにタイトルとCTAが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AIエージェント');
    await expect(page.getByTestId('cta-templates')).toBeVisible();
    await expect(page.getByTestId('cta-editor')).toBeVisible();
  });

  test('6つの機能カードが表示される', async ({ page }) => {
    const cards = page.getByTestId('feature-card');
    await expect(cards).toHaveCount(6);
  });

  test('ナビゲーションが5タブ表示される', async ({ page }) => {
    await expect(page.getByTestId('navigation')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-templates')).toBeVisible();
    await expect(page.getByTestId('nav-editor')).toBeVisible();
    await expect(page.getByTestId('nav-logs')).toBeVisible();
  });

  test('テンプレートCTAからテンプレートページへ遷移', async ({ page }) => {
    await page.getByTestId('cta-templates').click();
    await expect(page).toHaveURL('/templates');
    await expect(page.getByTestId('templates-page')).toBeVisible();
  });

  test('エディタCTAからエディタページへ遷移', async ({ page }) => {
    await page.getByTestId('cta-editor').click();
    await expect(page).toHaveURL('/editor');
    await expect(page.getByTestId('editor-page')).toBeVisible();
  });
});
