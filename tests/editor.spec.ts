import { test, expect } from '@playwright/test';

test.describe('エディタページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor');
    await page.waitForSelector('[data-testid="editor-page"]');
  });

  test('ページが正しくレンダリングされる', async ({ page }) => {
    await expect(page.getByTestId('editor-page')).toBeVisible();
    await expect(page.getByTestId('agent-info-section')).toBeVisible();
    await expect(page.getByTestId('workflow-section')).toBeVisible();
    await expect(page.getByTestId('ai-brain-section')).toBeVisible();
  });

  test('デフォルトでトリガーステップが1つ存在する', async ({ page }) => {
    const steps = page.getByTestId('workflow-step');
    await expect(steps).toHaveCount(1);
  });

  test('エージェント名を入力できる', async ({ page }) => {
    await page.getByTestId('agent-name-input').fill('テストエージェント');
    await expect(page.getByTestId('agent-name-input')).toHaveValue('テストエージェント');
  });

  test('ステップを追加できる', async ({ page }) => {
    await page.getByTestId('add-ai_decision-btn').click();
    const steps = page.getByTestId('workflow-step');
    await expect(steps).toHaveCount(2);
  });

  test('ステップを削除できる', async ({ page }) => {
    // Add a step first
    await page.getByTestId('add-action-btn').click();
    await expect(page.getByTestId('workflow-step')).toHaveCount(2);

    // Remove the second step
    const removeButtons = page.getByTestId('remove-step-btn');
    await removeButtons.last().click();
    await expect(page.getByTestId('workflow-step')).toHaveCount(1);
  });

  test('AIブレイン設定を入力できる', async ({ page }) => {
    const textarea = page.getByTestId('ai-brain-input');
    await textarea.fill('丁寧な日本語でクライアントに進捗報告して');
    await expect(textarea).toHaveValue('丁寧な日本語でクライアントに進捗報告して');
  });

  test('テスト実行でシミュレーション結果が表示される', async ({ page }) => {
    // First fill required fields
    await page.getByTestId('agent-name-input').fill('テストエージェント');
    // Click simulate
    await page.getByTestId('simulate-btn').click();
    await expect(page.getByTestId('simulation-result')).toBeVisible();
  });

  test('エージェントを保存できる', async ({ page }) => {
    await page.getByTestId('agent-name-input').fill('保存テスト');
    await page.getByTestId('save-btn').click();
    // Button should show saved state
    await expect(page.getByTestId('save-btn')).toContainText('保存しました');
  });

  test('テンプレートからエディタを開くとフィールドが事前入力される', async ({ page }) => {
    await page.goto('/editor?template=tpl_client_onboarding');
    await page.waitForSelector('[data-testid="editor-page"]');
    await expect(page.getByTestId('agent-name-input')).toHaveValue('クライアントオンボーディング');
    // Should have template steps
    const steps = page.getByTestId('workflow-step');
    const count = await steps.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
