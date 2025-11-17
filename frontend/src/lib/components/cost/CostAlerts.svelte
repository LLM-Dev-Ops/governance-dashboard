<script lang="ts">
	import Badge from '../common/Badge.svelte';
	import Button from '../common/Button.svelte';

	interface CostAlert {
		id: string;
		budget_name: string;
		threshold: number;
		current_usage: number;
		severity: 'info' | 'warning' | 'error';
		message: string;
		timestamp: string;
	}

	interface Props {
		alerts?: CostAlert[];
		onDismiss?: (id: string) => void;
		class?: string;
	}

	let { alerts = [], onDismiss, class: className = '' }: Props = $props();

	const severityVariant = (severity: string) => {
		switch (severity) {
			case 'error':
				return 'error';
			case 'warning':
				return 'warning';
			case 'info':
				return 'info';
			default:
				return 'neutral';
		}
	};

	const icons = {
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		warning:
			'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		error:
			'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
	};
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Cost Alerts</h3>
		{#if alerts.length > 0}
			<Badge variant="error">{alerts.length}</Badge>
		{/if}
	</div>

	<div class="space-y-3">
		{#if alerts.length === 0}
			<div class="text-center py-8">
				<svg
					class="w-12 h-12 mx-auto text-gray-400 mb-2"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="text-gray-500 dark:text-gray-400">No active cost alerts</p>
			</div>
		{:else}
			{#each alerts as alert}
				<div
					class="flex items-start gap-3 p-4 rounded-lg border {alert.severity === 'error'
						? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
						: alert.severity === 'warning'
							? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
							: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'}"
				>
					<svg
						class="w-5 h-5 flex-shrink-0 mt-0.5 {alert.severity === 'error'
							? 'text-red-600 dark:text-red-400'
							: alert.severity === 'warning'
								? 'text-yellow-600 dark:text-yellow-400'
								: 'text-blue-600 dark:text-blue-400'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d={icons[alert.severity]}
						/>
					</svg>
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-2 mb-1">
							<h4
								class="text-sm font-medium {alert.severity === 'error'
									? 'text-red-900 dark:text-red-200'
									: alert.severity === 'warning'
										? 'text-yellow-900 dark:text-yellow-200'
										: 'text-blue-900 dark:text-blue-200'}"
							>
								{alert.budget_name}
							</h4>
							<Badge variant={severityVariant(alert.severity)} size="sm">
								{alert.current_usage}% used
							</Badge>
						</div>
						<p
							class="text-sm {alert.severity === 'error'
								? 'text-red-800 dark:text-red-300'
								: alert.severity === 'warning'
									? 'text-yellow-800 dark:text-yellow-300'
									: 'text-blue-800 dark:text-blue-300'}"
						>
							{alert.message}
						</p>
						<div class="flex items-center justify-between mt-2">
							<p
								class="text-xs {alert.severity === 'error'
									? 'text-red-600 dark:text-red-400'
									: alert.severity === 'warning'
										? 'text-yellow-600 dark:text-yellow-400'
										: 'text-blue-600 dark:text-blue-400'}"
							>
								{new Date(alert.timestamp).toLocaleString()}
							</p>
							<button
								type="button"
								onclick={() => onDismiss?.(alert.id)}
								class="text-xs font-medium hover:underline {alert.severity === 'error'
									? 'text-red-700 dark:text-red-300'
									: alert.severity === 'warning'
										? 'text-yellow-700 dark:text-yellow-300'
										: 'text-blue-700 dark:text-blue-300'}"
							>
								Dismiss
							</button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
