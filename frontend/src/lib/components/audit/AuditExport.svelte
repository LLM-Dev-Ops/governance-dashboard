<script lang="ts">
	import Button from '../common/Button.svelte';
	import Select from '../common/Select.svelte';
	import DateRangePicker from '../common/DateRangePicker.svelte';
	import Modal from '../common/Modal.svelte';

	interface Props {
		open?: boolean;
		onClose?: () => void;
		onExport?: (format: string, startDate: string, endDate: string) => void;
	}

	let { open = $bindable(false), onClose, onExport }: Props = $props();

	let format = $state('csv');
	let startDate = $state('');
	let endDate = $state('');
	let loading = $state(false);

	const formatOptions = [
		{ value: 'csv', label: 'CSV' },
		{ value: 'json', label: 'JSON' },
		{ value: 'pdf', label: 'PDF' },
		{ value: 'excel', label: 'Excel' }
	];

	async function handleExport() {
		loading = true;
		try {
			await onExport?.(format, startDate, endDate);
			open = false;
		} finally {
			loading = false;
		}
	}
</script>

<Modal bind:open title="Export Audit Logs" size="md" {onClose}>
	<div class="space-y-4">
		<Select label="Export Format" bind:value={format} options={formatOptions} />

		<DateRangePicker label="Date Range" bind:startDate bind:endDate />

		<div
			class="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800"
		>
			<p class="text-sm text-blue-800 dark:text-blue-200">
				The export will include all audit logs within the selected date range.
			</p>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		<Button {loading} onclick={handleExport}>Export</Button>
	{/snippet}
</Modal>
