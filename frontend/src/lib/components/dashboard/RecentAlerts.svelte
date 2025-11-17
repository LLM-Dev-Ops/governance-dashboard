<script lang="ts">
	import Badge from '../common/Badge.svelte';

	interface Alert {
		id: string;
		title: string;
		message: string;
		severity: 'info' | 'warning' | 'error';
		timestamp: string;
	}

	interface Props {
		alerts?: Alert[];
		class?: string;
	}

	let { alerts = [], class: className = '' }: Props = $props();

	const severityMap = {
		info: 'info' as const,
		warning: 'warning' as const,
		error: 'error' as const
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
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
		<a href="/alerts" class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
			View all
		</a>
	</div>

	<div class="space-y-3">
		{#if alerts.length === 0}
			<p class="text-center py-8 text-gray-500 dark:text-gray-400">No recent alerts</p>
		{:else}
			{#each alerts as alert}
				<div
					class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
				>
					<svg
						class="w-5 h-5 flex-shrink-0 mt-0.5 {alert.severity === 'error'
							? 'text-red-500'
							: alert.severity === 'warning'
								? 'text-yellow-500'
								: 'text-blue-500'}"
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
						<div class="flex items-start justify-between gap-2">
							<h4 class="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</h4>
							<Badge variant={severityMap[alert.severity]} size="sm">
								{alert.severity}
							</Badge>
						</div>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">{alert.timestamp}</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
