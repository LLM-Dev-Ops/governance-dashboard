<script lang="ts">
	interface Props {
		currentPage?: number;
		totalPages: number;
		onPageChange?: (page: number) => void;
		class?: string;
	}

	let {
		currentPage = $bindable(1),
		totalPages,
		onPageChange,
		class: className = ''
	}: Props = $props();

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			onPageChange?.(page);
		}
	}

	let pages = $derived(() => {
		const result: (number | string)[] = [];
		const maxVisible = 7;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				result.push(i);
			}
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 5; i++) result.push(i);
				result.push('...');
				result.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				result.push(1);
				result.push('...');
				for (let i = totalPages - 4; i <= totalPages; i++) result.push(i);
			} else {
				result.push(1);
				result.push('...');
				for (let i = currentPage - 1; i <= currentPage + 1; i++) result.push(i);
				result.push('...');
				result.push(totalPages);
			}
		}
		return result;
	});
</script>

<div class="flex items-center justify-between {className}">
	<div class="text-sm text-gray-700 dark:text-gray-300">
		Page <span class="font-medium">{currentPage}</span> of
		<span class="font-medium">{totalPages}</span>
	</div>

	<nav class="flex items-center gap-1" aria-label="Pagination">
		<button
			type="button"
			class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
			disabled={currentPage === 1}
			onclick={() => goToPage(currentPage - 1)}
		>
			Previous
		</button>

		{#each pages() as page}
			{#if page === '...'}
				<span class="px-3 py-2 text-gray-500">...</span>
			{:else}
				<button
					type="button"
					class="px-3 py-2 text-sm font-medium rounded-lg {currentPage === page
						? 'bg-blue-600 text-white'
						: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}"
					onclick={() => goToPage(page as number)}
				>
					{page}
				</button>
			{/if}
		{/each}

		<button
			type="button"
			class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
			disabled={currentPage === totalPages}
			onclick={() => goToPage(currentPage + 1)}
		>
			Next
		</button>
	</nav>
</div>
