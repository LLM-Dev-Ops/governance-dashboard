<script lang="ts">
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

	interface ForecastData {
		historical: { date: string; cost: number }[];
		forecast: { date: string; cost: number }[];
	}

	interface Props {
		data?: ForecastData;
		title?: string;
		class?: string;
	}

	let {
		data = { historical: [], forecast: [] },
		title = 'Cost Forecast',
		class: className = ''
	}: Props = $props();

	const chartData = $derived({
		labels: [...data.historical.map((d) => d.date), ...data.forecast.map((d) => d.date)],
		datasets: [
			{
				label: 'Historical Cost',
				data: [
					...data.historical.map((d) => d.cost),
					...new Array(data.forecast.length).fill(null)
				],
				borderColor: 'rgb(59, 130, 246)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				fill: true,
				tension: 0.4
			},
			{
				label: 'Forecasted Cost',
				data: [
					...new Array(data.historical.length - 1).fill(null),
					data.historical[data.historical.length - 1]?.cost,
					...data.forecast.map((d) => d.cost)
				],
				borderColor: 'rgb(249, 115, 22)',
				backgroundColor: 'rgba(249, 115, 22, 0.1)',
				borderDash: [5, 5],
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
				position: 'top' as const
			},
			tooltip: {
				callbacks: {
					label: function (context: any) {
						return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
					}
				}
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
	<div class="h-96">
		<Line data={chartData} {options} />
	</div>

	<div
		class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800"
	>
		<p class="text-sm text-blue-800 dark:text-blue-200">
			Forecast is based on historical usage patterns and may vary based on actual consumption.
		</p>
	</div>
</div>
