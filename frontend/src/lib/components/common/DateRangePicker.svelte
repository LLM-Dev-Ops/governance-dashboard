<script lang="ts">
	import { format } from 'date-fns';

	interface Props {
		startDate?: string;
		endDate?: string;
		label?: string;
		class?: string;
		onchange?: (start: string, end: string) => void;
	}

	let {
		startDate = $bindable(''),
		endDate = $bindable(''),
		label,
		class: className = '',
		onchange
	}: Props = $props();

	function handleChange() {
		onchange?.(startDate, endDate);
	}
</script>

<div class="w-full {className}">
	{#if label}
		<label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
			{label}
		</label>
	{/if}
	<div class="flex gap-3">
		<div class="flex-1">
			<input
				type="date"
				bind:value={startDate}
				onchange={handleChange}
				class="block w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
			/>
		</div>
		<span class="flex items-center text-gray-500 dark:text-gray-400">to</span>
		<div class="flex-1">
			<input
				type="date"
				bind:value={endDate}
				onchange={handleChange}
				class="block w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
			/>
		</div>
	</div>
</div>
