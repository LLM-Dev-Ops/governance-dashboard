<script lang="ts">
	import Button from '../common/Button.svelte';
	import Select from '../common/Select.svelte';
	import DateRangePicker from '../common/DateRangePicker.svelte';
	import Badge from '../common/Badge.svelte';

	interface ReportData {
		total_events: number;
		compliant_events: number;
		non_compliant_events: number;
		compliance_rate: number;
	}

	interface Props {
		onGenerate?: (startDate: string, endDate: string, reportType: string) => void;
		reportData?: ReportData;
		class?: string;
	}

	let { onGenerate, reportData, class: className = '' }: Props = $props();

	let startDate = $state('');
	let endDate = $state('');
	let reportType = $state('full');
	let loading = $state(false);

	const reportTypeOptions = [
		{ value: 'full', label: 'Full Compliance Report' },
		{ value: 'summary', label: 'Summary Report' },
		{ value: 'violations', label: 'Violations Only' },
		{ value: 'policy', label: 'Policy Compliance' }
	];

	async function handleGenerate() {
		loading = true;
		try {
			await onGenerate?.(startDate, endDate, reportType);
		} finally {
			loading = false;
		}
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Compliance Report</h3>

	<div class="space-y-4 mb-6">
		<Select label="Report Type" bind:value={reportType} options={reportTypeOptions} />

		<DateRangePicker label="Report Period" bind:startDate bind:endDate />

		<Button {loading} fullWidth onclick={handleGenerate}>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			Generate Report
		</Button>
	</div>

	{#if reportData}
		<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
			<h4 class="font-medium text-gray-900 dark:text-white mb-4">Report Summary</h4>
			<div class="grid grid-cols-2 gap-4">
				<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
					<p class="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
					<p class="text-2xl font-bold text-gray-900 dark:text-white">{reportData.total_events}</p>
				</div>
				<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
					<p class="text-sm text-gray-600 dark:text-gray-400">Compliance Rate</p>
					<p
						class="text-2xl font-bold {reportData.compliance_rate >= 95
							? 'text-green-600 dark:text-green-400'
							: reportData.compliance_rate >= 80
								? 'text-yellow-600 dark:text-yellow-400'
								: 'text-red-600 dark:text-red-400'}"
					>
						{reportData.compliance_rate}%
					</p>
				</div>
				<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
					<p class="text-sm text-gray-600 dark:text-gray-400">Compliant Events</p>
					<p class="text-2xl font-bold text-green-600 dark:text-green-400">
						{reportData.compliant_events}
					</p>
				</div>
				<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
					<p class="text-sm text-gray-600 dark:text-gray-400">Non-Compliant</p>
					<p class="text-2xl font-bold text-red-600 dark:text-red-400">
						{reportData.non_compliant_events}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
