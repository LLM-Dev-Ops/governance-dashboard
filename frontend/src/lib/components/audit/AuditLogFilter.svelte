<script lang="ts">
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import Select from '../common/Select.svelte';
	import DateRangePicker from '../common/DateRangePicker.svelte';

	interface FilterCriteria {
		user?: string;
		action?: string;
		status?: string;
		startDate?: string;
		endDate?: string;
	}

	interface Props {
		onFilter?: (criteria: FilterCriteria) => void;
		onReset?: () => void;
		class?: string;
	}

	let { onFilter, onReset, class: className = '' }: Props = $props();

	let user = $state('');
	let action = $state('');
	let status = $state('');
	let startDate = $state('');
	let endDate = $state('');

	const actionOptions = [
		{ value: '', label: 'All Actions' },
		{ value: 'create', label: 'Create' },
		{ value: 'read', label: 'Read' },
		{ value: 'update', label: 'Update' },
		{ value: 'delete', label: 'Delete' },
		{ value: 'login', label: 'Login' },
		{ value: 'logout', label: 'Logout' }
	];

	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'success', label: 'Success' },
		{ value: 'failure', label: 'Failure' },
		{ value: 'warning', label: 'Warning' }
	];

	function handleApplyFilter() {
		onFilter?.({ user, action, status, startDate, endDate });
	}

	function handleReset() {
		user = '';
		action = '';
		status = '';
		startDate = '';
		endDate = '';
		onReset?.();
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>

	<div class="space-y-4">
		<Input
			type="search"
			label="User"
			bind:value={user}
			placeholder="Filter by user email or name"
		/>

		<Select label="Action" bind:value={action} options={actionOptions} />

		<Select label="Status" bind:value={status} options={statusOptions} />

		<DateRangePicker label="Date Range" bind:startDate bind:endDate />

		<div class="flex gap-3 pt-2">
			<Button variant="outline" fullWidth onclick={handleReset}>Reset</Button>
			<Button fullWidth onclick={handleApplyFilter}>Apply Filters</Button>
		</div>
	</div>
</div>
