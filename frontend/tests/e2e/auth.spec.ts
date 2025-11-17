import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display login page', async ({ page }) => {
		await expect(page).toHaveTitle(/LLM Governance Dashboard/i);
		await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
	});

	test('should show validation errors for invalid email', async ({ page }) => {
		await page.goto('/login');
		const emailInput = page.getByLabel(/email/i);
		const passwordInput = page.getByLabel(/password/i);

		await emailInput.fill('invalid-email');
		await passwordInput.fill('password123');
		await passwordInput.blur();

		await expect(page.getByText(/invalid email/i)).toBeVisible();
	});

	test('should login with valid credentials', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();

		// Should redirect to dashboard
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByText(/welcome/i)).toBeVisible();
	});

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel(/email/i).fill('wrong@example.com');
		await page.getByLabel(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /login/i }).click();

		await expect(page.getByText(/invalid credentials/i)).toBeVisible();
	});

	test('should logout successfully', async ({ page }) => {
		// Login first
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();

		await expect(page).toHaveURL(/\/dashboard/);

		// Then logout
		await page.getByRole('button', { name: /logout/i }).click();

		// Should redirect to login
		await expect(page).toHaveURL(/\/login/);
	});

	test('should register new user', async ({ page }) => {
		await page.goto('/register');

		await page.getByLabel(/email/i).fill('newuser@example.com');
		await page.getByLabel(/name/i).fill('New User');
		await page.getByLabel(/password/i).fill('SecurePass123!');
		await page.getByLabel(/confirm password/i).fill('SecurePass123!');
		await page.getByRole('button', { name: /register/i }).click();

		// Should show success message
		await expect(page.getByText(/registration successful/i)).toBeVisible();
	});

	test('should persist login after page refresh', async ({ page, context }) => {
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('AdminPass123!');
		await page.getByRole('button', { name: /login/i }).click();

		await expect(page).toHaveURL(/\/dashboard/);

		// Refresh page
		await page.reload();

		// Should still be logged in
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByText(/welcome/i)).toBeVisible();
	});
});
