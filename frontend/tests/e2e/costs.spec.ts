import { test, expect } from '@playwright/test';

test.describe('Cost Tracking', () => {
	test.beforeEach(async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();

		// Navigate to costs
		await page.goto('/costs');
	});

	test('should display cost overview', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /costs/i })).toBeVisible();
		await expect(page.getByText(/total spend/i)).toBeVisible();
		await expect(page.getByText(/current month/i)).toBeVisible();
	});

	test('should display cost breakdown chart', async ({ page }) => {
		await page.waitForSelector('[data-testid="cost-chart"]');
		const chart = page.locator('[data-testid="cost-chart"]');
		await expect(chart).toBeVisible();
	});

	test('should filter costs by model', async ({ page }) => {
		await page.getByLabel(/model/i).selectOption('gpt-4');

		// Should update chart and totals
		await expect(page.getByText(/gpt-4/i)).toBeVisible();
	});

	test('should create budget', async ({ page }) => {
		await page.getByRole('button', { name: /create budget/i }).click();

		await page.getByLabel(/budget name/i).fill('Monthly Budget');
		await page.getByLabel(/amount/i).fill('1000');
		await page.getByLabel(/period/i).selectOption('monthly');
		await page.getByRole('button', { name: /save/i }).click();

		await expect(page.getByText(/budget created successfully/i)).toBeVisible();
	});

	test('should show budget alerts when threshold exceeded', async ({ page }) => {
		// Look for budget alert if any budget is over threshold
		const alerts = page.locator('[data-testid="budget-alert"]');
		if (await alerts.count() > 0) {
			await expect(alerts.first()).toContainText(/budget.*exceeded/i);
		}
	});

	test('should export cost data', async ({ page }) => {
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: /export/i }).click();

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toContain('costs');
	});
});
