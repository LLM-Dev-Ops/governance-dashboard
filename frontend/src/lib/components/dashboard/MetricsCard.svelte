<script lang="ts">
	interface Props {
		title: string;
		value: string | number;
		change?: number;
		icon?: string;
		trend?: 'up' | 'down';
		class?: string;
	}

	let { title, value, change, icon, trend, class: className = '' }: Props = $props();

	const trendColor = $derived(
		trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
	);

	const icons: Record<string, string> = {
		usage: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		cost: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
		violations:
			'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
	};
</script>

<div
	class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow {className}"
>
	<div class="flex items-center justify-between">
		<div class="flex-1">
			<p class="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
			<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
			{#if change !== undefined}
				<div class="mt-2 flex items-center gap-1 text-sm {trendColor}">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						{#if trend === 'up'}
							<path
								fill-rule="evenodd"
								d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
								clip-rule="evenodd"
							/>
						{:else}
							<path
								fill-rule="evenodd"
								d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						{/if}
					</svg>
					<span>{Math.abs(change)}%</span>
				</div>
			{/if}
		</div>
		{#if icon}
			<div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
				<svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[icon]} />
				</svg>
			</div>
		{/if}
	</div>
</div>
