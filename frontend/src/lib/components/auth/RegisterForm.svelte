<script lang="ts">
	import { goto } from '$app/navigation';
	import { authApi } from '$lib/api/auth';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import ErrorMessage from '../common/ErrorMessage.svelte';
	import { z } from 'zod';

	const registerSchema = z
		.object({
			email: z.string().email('Invalid email address'),
			password: z.string().min(8, 'Password must be at least 8 characters'),
			confirmPassword: z.string(),
			fullName: z.string().min(2, 'Name must be at least 2 characters'),
			acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms')
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: "Passwords don't match",
			path: ['confirmPassword']
		});

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let fullName = $state('');
	let acceptTerms = $state(false);
	let loading = $state(false);
	let error = $state('');
	let errors = $state<Record<string, string>>({});
	let success = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errors = {};
		error = '';

		// Validate form
		const result = registerSchema.safeParse({
			email,
			password,
			confirmPassword,
			fullName,
			acceptTerms
		});

		if (!result.success) {
			result.error.issues.forEach((err) => {
				errors[err.path[0] as string] = err.message;
			});
			return;
		}

		loading = true;

		try {
			await authApi.register({ email, password, full_name: fullName });
			success = true;
			setTimeout(() => goto('/auth/login'), 2000);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Registration failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full max-w-md mx-auto">
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
		<div class="text-center mb-8">
			<h2 class="text-3xl font-bold text-gray-900 dark:text-white">Create Account</h2>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				Get started with LLM Governance Dashboard
			</p>
		</div>

		{#if error}
			<ErrorMessage message={error} class="mb-4" />
		{/if}

		{#if success}
			<div
				class="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800 mb-4"
			>
				<p class="text-sm text-green-800 dark:text-green-200">
					Account created successfully! Redirecting to login...
				</p>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-4">
			<Input
				type="text"
				label="Full Name"
				bind:value={fullName}
				placeholder="John Doe"
				required
				error={errors.fullName}
				autocomplete="name"
			/>

			<Input
				type="email"
				label="Email"
				bind:value={email}
				placeholder="you@company.com"
				required
				error={errors.email}
				autocomplete="email"
			/>

			<Input
				type="password"
				label="Password"
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

			<div>
				<label class="flex items-start gap-2">
					<input
						type="checkbox"
						bind:checked={acceptTerms}
						class="w-4 h-4 mt-1 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
					/>
					<span class="text-sm text-gray-700 dark:text-gray-300">
						I agree to the
						<a href="/terms" class="text-blue-600 hover:text-blue-700 dark:text-blue-400"
							>Terms of Service</a
						>
						and
						<a href="/privacy" class="text-blue-600 hover:text-blue-700 dark:text-blue-400"
							>Privacy Policy</a
						>
					</span>
				</label>
				{#if errors.acceptTerms}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.acceptTerms}</p>
				{/if}
			</div>

			<Button type="submit" {loading} fullWidth disabled={success}>Create Account</Button>
		</form>

		<div class="mt-6">
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
						Or sign up with
					</span>
				</div>
			</div>

			<div class="mt-6 grid grid-cols-2 gap-3">
				<button
					type="button"
					class="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="currentColor"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="currentColor"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="currentColor"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					Google
				</button>
				<button
					type="button"
					class="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
						/>
					</svg>
					GitHub
				</button>
			</div>
		</div>

		<p class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
			Already have an account?
			<a
				href="/auth/login"
				class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
			>
				Sign in
			</a>
		</p>
	</div>
</div>
