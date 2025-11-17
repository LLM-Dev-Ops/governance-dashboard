<script lang="ts">
	import { authApi } from '$lib/api/auth';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import ErrorMessage from '../common/ErrorMessage.svelte';

	interface Props {
		onComplete?: () => void;
	}

	let { onComplete }: Props = $props();

	let step = $state<'setup' | 'verify'>('setup');
	let qrCode = $state('');
	let secret = $state('');
	let backupCodes = $state<string[]>([]);
	let verificationCode = $state('');
	let loading = $state(false);
	let error = $state('');

	async function setupMFA() {
		loading = true;
		error = '';

		try {
			const response = await authApi.setupMFA();
			qrCode = response.qr_code;
			secret = response.secret;
			backupCodes = response.backup_codes;
			step = 'verify';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to setup MFA';
		} finally {
			loading = false;
		}
	}

	async function verifyMFA() {
		if (!verificationCode || verificationCode.length !== 6) {
			error = 'Please enter a valid 6-digit code';
			return;
		}

		loading = true;
		error = '';

		try {
			await authApi.verifyMFASetup(verificationCode);
			onComplete?.();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Verification failed';
		} finally {
			loading = false;
		}
	}

	function downloadBackupCodes() {
		const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'llm-governance-backup-codes.txt';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
		<div class="text-center mb-8">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
				Set Up Two-Factor Authentication
			</h2>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				Add an extra layer of security to your account
			</p>
		</div>

		{#if error}
			<ErrorMessage message={error} class="mb-4" />
		{/if}

		{#if step === 'setup'}
			<div class="space-y-6">
				<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
					<h3 class="font-medium text-blue-900 dark:text-blue-200 mb-2">Before you start:</h3>
					<ul class="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
						<li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
						<li>Make sure you have your device ready</li>
						<li>Save the backup codes in a secure location</li>
					</ul>
				</div>

				<Button onclick={setupMFA} {loading} fullWidth>Begin Setup</Button>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- QR Code -->
				<div class="text-center">
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						Scan this QR code with your authenticator app
					</p>
					{#if qrCode}
						<div class="flex justify-center mb-4">
							<img src={qrCode} alt="MFA QR Code" class="w-48 h-48 border-2 border-gray-300 dark:border-gray-600 rounded-lg" />
						</div>
					{/if}
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Or enter this code manually:</p>
					<code
						class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded font-mono text-sm"
					>
						{secret}
					</code>
				</div>

				<!-- Backup Codes -->
				{#if backupCodes.length > 0}
					<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
						<h3 class="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
							Backup Codes
						</h3>
						<p class="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
							Save these codes in a secure location. You can use them to access your account if
							you lose your device.
						</p>
						<div class="grid grid-cols-2 gap-2 mb-3">
							{#each backupCodes as code}
								<code
									class="px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm font-mono"
								>
									{code}
								</code>
							{/each}
						</div>
						<Button variant="outline" size="sm" onclick={downloadBackupCodes}>
							Download Codes
						</Button>
					</div>
				{/if}

				<!-- Verification -->
				<div>
					<Input
						type="text"
						label="Verification Code"
						bind:value={verificationCode}
						placeholder="000000"
						required
						helpText="Enter the 6-digit code from your authenticator app"
					/>
				</div>

				<div class="flex gap-3">
					<Button variant="outline" fullWidth onclick={() => (step = 'setup')}>
						Cancel
					</Button>
					<Button {loading} fullWidth onclick={verifyMFA}>
						Verify & Enable
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
