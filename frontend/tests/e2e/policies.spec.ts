import { test, expect } from '@playwright/test';

test.describe('Policy Management', () => {
	test.beforeEach(async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();
		await expect(page).toHaveURL(/\/dashboard/);

		// Navigate to policies
		await page.goto('/policies');
	});

	test('should display policies list', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /create policy/i })).toBeVisible();
	});

	test('should create new policy', async ({ page }) => {
		await page.getByRole('button', { name: /create policy/i }).click();

		// Fill in policy form
		await page.getByLabel(/policy name/i).fill('Rate Limit Policy');
		await page.getByLabel(/description/i).fill('Limit requests to 100 per hour');
		await page.getByLabel(/type/i).selectOption('rate_limit');
		await page.getByLabel(/max requests/i).fill('100');
		await page.getByLabel(/time window/i).selectOption('hour');

		await page.getByRole('button', { name: /save/i }).click();

		// Should show success message
		await expect(page.getByText(/policy created successfully/i)).toBeVisible();

		// Should see new policy in list
		await expect(page.getByText(/rate limit policy/i)).toBeVisible();
	});

	test('should edit existing policy', async ({ page }) => {
		// Click edit on first policy
		await page.locator('[data-testid="policy-item"]').first()
			.getByRole('button', { name: /edit/i }).click();

		// Update policy
		await page.getByLabel(/policy name/i).fill('Updated Policy Name');
		await page.getByRole('button', { name: /save/i }).click();

		await expect(page.getByText(/policy updated successfully/i)).toBeVisible();
		await expect(page.getByText(/updated policy name/i)).toBeVisible();
	});

	test('should delete policy', async ({ page }) => {
		// Click delete on first policy
		await page.locator('[data-testid="policy-item"]').first()
			.getByRole('button', { name: /delete/i }).click();

		// Confirm deletion
		await page.getByRole('button', { name: /confirm/i }).click();

		await expect(page.getByText(/policy deleted successfully/i)).toBeVisible();
	});

	test('should enable/disable policy', async ({ page }) => {
		const policyToggle = page.locator('[data-testid="policy-item"]').first()
			.getByRole('switch');

		const initialState = await policyToggle.isChecked();
		await policyToggle.click();

		// State should change
		await expect(policyToggle).toHaveAttribute('aria-checked', String(!initialState));
		await expect(page.getByText(/policy (enabled|disabled)/i)).toBeVisible();
	});

	test('should search policies', async ({ page }) => {
		await page.getByPlaceholder(/search policies/i).fill('rate limit');

		// Should filter results
		await expect(page.getByText(/rate limit/i)).toBeVisible();
	});
});
