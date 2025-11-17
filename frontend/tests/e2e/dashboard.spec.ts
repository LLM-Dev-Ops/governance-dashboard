import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		// Login before each test
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('should display dashboard overview', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

		// Check for key metrics
		await expect(page.getByText(/total requests/i)).toBeVisible();
		await expect(page.getByText(/total cost/i)).toBeVisible();
		await expect(page.getByText(/active users/i)).toBeVisible();
	});

	test('should display usage charts', async ({ page }) => {
		// Wait for charts to load
		await page.waitForSelector('[data-testid="usage-chart"]', { timeout: 5000 });

		const chart = page.locator('[data-testid="usage-chart"]');
		await expect(chart).toBeVisible();
	});

	test('should navigate to different sections', async ({ page }) => {
		await page.getByRole('link', { name: /policies/i }).click();
		await expect(page).toHaveURL(/\/policies/);

		await page.getByRole('link', { name: /audit logs/i }).click();
		await expect(page).toHaveURL(/\/audit/);

		await page.getByRole('link', { name: /costs/i }).click();
		await expect(page).toHaveURL(/\/costs/);
	});

	test('should filter data by date range', async ({ page }) => {
		await page.getByRole('button', { name: /filter/i }).click();

		await page.getByLabel(/start date/i).fill('2025-01-01');
		await page.getByLabel(/end date/i).fill('2025-01-31');
		await page.getByRole('button', { name: /apply/i }).click();

		// Check that data is filtered
		await expect(page.getByText(/jan 1.*jan 31/i)).toBeVisible();
	});

	test('should refresh data', async ({ page }) => {
		const refreshButton = page.getByRole('button', { name: /refresh/i });
		await refreshButton.click();

		// Should show loading state
		await expect(page.getByText(/loading/i)).toBeVisible();

		// Should complete loading
		await expect(page.getByText(/loading/i)).not.toBeVisible();
	});
});
