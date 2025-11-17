<script lang="ts">
	import { Pie } from 'svelte-chartjs';
	import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

	ChartJS.register(ArcElement, Tooltip, Legend);

	interface BreakdownItem {
		category: string;
		cost: number;
		percentage: number;
	}

	interface Props {
		data?: BreakdownItem[];
		title?: string;
		class?: string;
	}

	let { data = [], title = 'Cost Breakdown', class: className = '' }: Props = $props();

	const chartData = $derived({
		labels: data.map((item) => item.category),
		datasets: [
			{
				data: data.map((item) => item.cost),
				backgroundColor: [
					'rgb(59, 130, 246)',
					'rgb(16, 185, 129)',
					'rgb(249, 115, 22)',
					'rgb(139, 92, 246)',
					'rgb(236, 72, 153)',
					'rgb(234, 179, 8)'
				],
				borderWidth: 0
			}
		]
	});

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'right' as const
			},
			tooltip: {
				callbacks: {
					label: function (context: any) {
						const label = context.label || '';
						const value = context.parsed || 0;
						return `${label}: $${value.toFixed(2)}`;
					}
				}
			}
		}
	};
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="h-80">
			<Pie data={chartData} {options} />
		</div>

		<div class="space-y-3">
			{#each data as item}
				<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-gray-900 dark:text-white">{item.category}</span>
						<span class="text-sm text-gray-600 dark:text-gray-400">{item.percentage}%</span>
					</div>
					<p class="text-2xl font-bold text-gray-900 dark:text-white">
						${item.cost.toFixed(2)}
					</p>
				</div>
			{/each}
		</div>
	</div>
</div>
