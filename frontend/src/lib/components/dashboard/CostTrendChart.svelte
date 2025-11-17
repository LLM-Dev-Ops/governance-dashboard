<script lang="ts">
	import { onMount } from 'svelte';
	import { Bar } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		CategoryScale,
		LinearScale,
		BarElement,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';

	ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

	interface Props {
		data?: { labels: string[]; values: number[] };
		title?: string;
		class?: string;
	}

	let { data, title = 'Cost Trends', class: className = '' }: Props = $props();

	const chartData = $derived({
		labels: data?.labels || [],
		datasets: [
			{
				label: 'Cost ($)',
				data: data?.values || [],
				backgroundColor: 'rgba(59, 130, 246, 0.8)',
				borderColor: 'rgb(59, 130, 246)',
				borderWidth: 1
			}
		]
	});

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: 'top' as const
			},
			title: {
				display: false
			}
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: 'rgba(156, 163, 175, 0.1)'
				},
				ticks: {
					callback: function (value: any) {
						return '$' + value;
					}
				}
			},
			x: {
				grid: {
					display: false
				}
			}
		}
	};
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
	<div class="h-80">
		<Bar data={chartData} {options} />
	</div>
</div>
