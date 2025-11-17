import { test, expect } from '@playwright/test';

test.describe('Audit Logs', () => {
	test.beforeEach(async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();

		// Navigate to audit logs
		await page.goto('/audit');
	});

	test('should display audit logs', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /audit logs/i })).toBeVisible();
	});

	test('should filter logs by date range', async ({ page }) => {
		await page.getByLabel(/start date/i).fill('2025-01-01');
		await page.getByLabel(/end date/i).fill('2025-01-31');
		await page.getByRole('button', { name: /apply filter/i }).click();

		// Wait for results
		await page.waitForSelector('[data-testid="audit-log-item"]');
	});

	test('should filter logs by event type', async ({ page }) => {
		await page.getByLabel(/event type/i).selectOption('user.login');

		// Should only show login events
		const logs = page.locator('[data-testid="audit-log-item"]');
		await expect(logs.first()).toContainText(/login/i);
	});

	test('should filter logs by user', async ({ page }) => {
		await page.getByLabel(/user/i).fill('admin@example.com');
		await page.getByRole('button', { name: /apply filter/i }).click();

		// Should only show logs for admin user
		const logs = page.locator('[data-testid="audit-log-item"]');
		await expect(logs.first()).toContainText(/admin@example.com/i);
	});

	test('should paginate through logs', async ({ page }) => {
		// Go to next page
		await page.getByRole('button', { name: /next/i }).click();

		// URL should update with page parameter
		await expect(page).toHaveURL(/page=2/);
	});

	test('should view log details', async ({ page }) => {
		await page.locator('[data-testid="audit-log-item"]').first().click();

		// Should open detail modal
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByText(/event details/i)).toBeVisible();
	});

	test('should export logs', async ({ page }) => {
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: /export/i }).click();

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toContain('audit-logs');
	});
});
