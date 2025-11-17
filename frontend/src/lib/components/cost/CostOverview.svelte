<script lang="ts">
	import MetricsCard from '../dashboard/MetricsCard.svelte';

	interface CostData {
		total_cost: number;
		monthly_cost: number;
		daily_cost: number;
		budget_used: number;
		cost_change: number;
	}

	interface Props {
		data?: CostData;
		class?: string;
	}

	let {
		data = {
			total_cost: 0,
			monthly_cost: 0,
			daily_cost: 0,
			budget_used: 0,
			cost_change: 0
		},
		class: className = ''
	}: Props = $props();

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(value);
	};
</script>

<div class="{className}">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Cost Overview</h2>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<MetricsCard
			title="Total Cost"
			value={formatCurrency(data.total_cost)}
			icon="cost"
			change={data.cost_change}
			trend={data.cost_change > 0 ? 'up' : 'down'}
		/>

		<MetricsCard
			title="Monthly Cost"
			value={formatCurrency(data.monthly_cost)}
			icon="cost"
		/>

		<MetricsCard
			title="Daily Average"
			value={formatCurrency(data.daily_cost)}
			icon="cost"
		/>

		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
		>
			<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Budget Usage</p>
			<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{data.budget_used}%</p>
			<div class="mt-3 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
				<div
					class="h-2 rounded-full {data.budget_used > 90
						? 'bg-red-600'
						: data.budget_used > 75
							? 'bg-yellow-600'
							: 'bg-green-600'}"
					style="width: {Math.min(data.budget_used, 100)}%"
				></div>
			</div>
		</div>
	</div>
</div>
