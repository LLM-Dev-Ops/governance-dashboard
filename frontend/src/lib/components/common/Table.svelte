<script lang="ts">
	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		class?: string;
	}

	interface Props {
		columns: Column[];
		data: any[];
		loading?: boolean;
		emptyMessage?: string;
		sortKey?: string;
		sortDirection?: 'asc' | 'desc';
		onSort?: (key: string) => void;
		rowClass?: (row: any) => string;
		class?: string;
		children?: any;
	}

	let {
		columns,
		data,
		loading = false,
		emptyMessage = 'No data available',
		sortKey = $bindable(''),
		sortDirection = $bindable('asc'),
		onSort,
		rowClass,
		class: className = '',
		children
	}: Props = $props();

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
		onSort?.(key);
	}
</script>

<div class="overflow-x-auto {className}">
	<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
		<thead class="bg-gray-50 dark:bg-gray-800">
			<tr>
				{#each columns as column}
					<th
						scope="col"
						class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider {column.class ||
							''}"
					>
						{#if column.sortable}
							<button
								type="button"
								class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
								onclick={() => handleSort(column.key)}
							>
								{column.label}
								{#if sortKey === column.key}
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										{#if sortDirection === 'asc'}
											<path
												d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											/>
										{:else}
											<path
												d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
											/>
										{/if}
									</svg>
								{/if}
							</button>
						{:else}
							{column.label}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
			{#if loading}
				<tr>
					<td colspan={columns.length} class="px-6 py-12 text-center">
						<div class="flex justify-center">
							<div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
						</div>
					</td>
				</tr>
			{:else if data.length === 0}
				<tr>
					<td
						colspan={columns.length}
						class="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each data as row, index}
					<tr
						class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors {rowClass?.(row) ||
							''}"
					>
						{@render children?.(row, index)}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
