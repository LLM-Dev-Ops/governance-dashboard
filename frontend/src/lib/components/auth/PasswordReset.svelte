<script lang="ts">
	import { authApi } from '$lib/api/auth';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import ErrorMessage from '../common/ErrorMessage.svelte';
	import { z } from 'zod';

	const emailSchema = z.object({
		email: z.string().email('Invalid email address')
	});

	const resetSchema = z
		.object({
			password: z.string().min(8, 'Password must be at least 8 characters'),
			confirmPassword: z.string()
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: "Passwords don't match",
			path: ['confirmPassword']
		});

	interface Props {
		token?: string;
	}

	let { token }: Props = $props();

	let step = $derived(token ? 'reset' : 'request');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let errors = $state<Record<string, string>>({});
	let success = $state(false);

	async function handleRequestReset(e: Event) {
		e.preventDefault();
		errors = {};
		error = '';

		const result = emailSchema.safeParse({ email });
		if (!result.success) {
			result.error.issues.forEach((err) => {
				errors[err.path[0] as string] = err.message;
			});
			return;
		}

		loading = true;

		try {
			await authApi.requestPasswordReset(email);
			success = true;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to send reset email';
		} finally {
			loading = false;
		}
	}

	async function handleResetPassword(e: Event) {
		e.preventDefault();
		errors = {};
		error = '';

		const result = resetSchema.safeParse({ password, confirmPassword });
		if (!result.success) {
			result.error.issues.forEach((err) => {
				errors[err.path[0] as string] = err.message;
			});
			return;
		}

		loading = true;

		try {
			await authApi.resetPassword(token!, password);
			success = true;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to reset password';
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full max-w-md mx-auto">
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
		<div class="text-center mb-8">
			<h2 class="text-3xl font-bold text-gray-900 dark:text-white">
				{step === 'request' ? 'Reset Password' : 'Create New Password'}
			</h2>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				{step === 'request'
					? "Enter your email and we'll send you a reset link"
					: 'Enter your new password below'}
			</p>
		</div>

		{#if error}
			<ErrorMessage message={error} class="mb-4" />
		{/if}

		{#if success}
			<div
				class="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800 mb-4"
			>
				<h3 class="font-medium text-green-900 dark:text-green-200 mb-1">Success!</h3>
				<p class="text-sm text-green-800 dark:text-green-300">
					{step === 'request'
						? 'Check your email for a password reset link.'
						: 'Your password has been reset successfully.'}
				</p>
			</div>
		{/if}

		{#if step === 'request'}
			<form onsubmit={handleRequestReset} class="space-y-4">
				<Input
					type="email"
					label="Email"
					bind:value={email}
					placeholder="you@company.com"
					required
					error={errors.email}
					autocomplete="email"
				/>

				<Button type="submit" {loading} fullWidth disabled={success}>
					Send Reset Link
				</Button>
			</form>
		{:else}
			<form onsubmit={handleResetPassword} class="space-y-4">
				<Input
					type="password"
					label="New Password"
					bind:value={password}
					placeholder="Create a strong password"
					required
					error={errors.password}
					autocomplete="new-password"
					helpText="Must be at least 8 characters"
				/>

				<Input
					type="password"
					label="Confirm Password"
					bind:value={confirmPassword}
					placeholder="Re-enter your password"
					required
					error={errors.confirmPassword}
					autocomplete="new-password"
				/>

				<Button type="submit" {loading} fullWidth disabled={success}>
					Reset Password
				</Button>
			</form>
		{/if}

		<div class="mt-6 text-center">
			<a
				href="/auth/login"
				class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
			>
				Back to login
			</a>
		</div>
	</div>
</div>
