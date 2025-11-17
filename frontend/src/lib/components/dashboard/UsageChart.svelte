<script lang="ts">
	import { onMount } from 'svelte';
	import { Line } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		CategoryScale,
		LinearScale,
		PointElement,
		LineElement,
		Title,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';

	ChartJS.register(
		CategoryScale,
		LinearScale,
		PointElement,
		LineElement,
		Title,
		Tooltip,
		Legend,
		Filler
	);

	interface Props {
		data?: { labels: string[]; values: number[] };
		title?: string;
		class?: string;
	}

	let { data, title = 'LLM Usage Over Time', class: className = '' }: Props = $props();

	const chartData = $derived({
		labels: data?.labels || [],
		datasets: [
			{
				label: 'API Calls',
				data: data?.values || [],
				borderColor: 'rgb(59, 130, 246)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				fill: true,
				tension: 0.4
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
		<Line data={chartData} {options} />
	</div>
</div>
