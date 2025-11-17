<script lang="ts">
	import Badge from '../common/Badge.svelte';
	import { Doughnut } from 'svelte-chartjs';
	import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

	ChartJS.register(ArcElement, Tooltip, Legend);

	interface ComplianceData {
		total_policies: number;
		active_policies: number;
		violations: number;
		compliance_score: number;
		status: 'compliant' | 'warning' | 'critical';
	}

	interface Props {
		data?: ComplianceData;
		class?: string;
	}

	let {
		data = {
			total_policies: 0,
			active_policies: 0,
			violations: 0,
			compliance_score: 0,
			status: 'compliant'
		},
		class: className = ''
	}: Props = $props();

	const chartData = $derived({
		labels: ['Compliant', 'Violations'],
		datasets: [
			{
				data: [100 - (data.violations / data.total_policies) * 100, (data.violations / data.total_policies) * 100],
				backgroundColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
				borderWidth: 0
			}
		]
	});

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom' as const
			}
		}
	};

	const statusVariant = $derived(
		data.status === 'compliant' ? 'success' : data.status === 'warning' ? 'warning' : 'error'
	);
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<div class="flex items-center justify-between mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Compliance Status</h3>
		<Badge variant={statusVariant}>{data.status}</Badge>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<div class="space-y-4">
			<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400">Compliance Score</p>
				<div class="mt-2 flex items-baseline gap-2">
					<p class="text-4xl font-bold text-gray-900 dark:text-white">
						{data.compliance_score}%
					</p>
				</div>
			</div>

			<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400">Total Policies</p>
				<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
					{data.total_policies}
				</p>
			</div>

			<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400">Active Policies</p>
				<p class="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
					{data.active_policies}
				</p>
			</div>

			<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400">Total Violations</p>
				<p class="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{data.violations}</p>
			</div>
		</div>

		<div class="flex items-center justify-center">
			<div class="w-full h-64">
				<Doughnut data={chartData} {options} />
			</div>
		</div>
	</div>
</div>
