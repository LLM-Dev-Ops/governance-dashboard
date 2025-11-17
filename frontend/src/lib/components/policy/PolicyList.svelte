<script lang="ts">
	import Table from '../common/Table.svelte';
	import Pagination from '../common/Pagination.svelte';
	import Badge from '../common/Badge.svelte';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';

	interface Policy {
		id: string;
		name: string;
		description: string;
		status: 'active' | 'inactive' | 'draft';
		violations: number;
		created_at: string;
	}

	interface Props {
		policies?: Policy[];
		loading?: boolean;
		totalPages?: number;
		onPageChange?: (page: number) => void;
		onSearch?: (query: string) => void;
		onCreate?: () => void;
		onEdit?: (id: string) => void;
		class?: string;
	}

	let {
		policies = [],
		loading = false,
		totalPages = 1,
		onPageChange,
		onSearch,
		onCreate,
		onEdit,
		class: className = ''
	}: Props = $props();

	let searchQuery = $state('');
	let currentPage = $state(1);

	const columns = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'description', label: 'Description' },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'violations', label: 'Violations', sortable: true },
		{ key: 'created_at', label: 'Created', sortable: true },
		{ key: 'actions', label: 'Actions' }
	];

	function handleSearch() {
		onSearch?.(searchQuery);
	}

	const statusVariant = (status: string) => {
		switch (status) {
			case 'active':
				return 'success';
			case 'inactive':
				return 'neutral';
			case 'draft':
				return 'warning';
			default:
				return 'neutral';
		}
	};
</script>

<div class="{className}">
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Policies</h2>
		<Button onclick={onCreate}>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Create Policy
		</Button>
	</div>

	<div class="mb-6">
		<div class="flex gap-4">
			<div class="flex-1">
				<Input
					type="search"
					bind:value={searchQuery}
					placeholder="Search policies..."
					oninput={handleSearch}
				/>
			</div>
		</div>
	</div>

	<div class="bg-white dark:bg-gray-800 rounded-lg shadow">
		<Table {columns} data={policies} {loading}>
			{#snippet children(policy: Policy)}
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm font-medium text-gray-900 dark:text-white">{policy.name}</div>
				</td>
				<td class="px-6 py-4">
					<div class="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
						{policy.description}
					</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<Badge variant={statusVariant(policy.status)}>
						{policy.status}
					</Badge>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<span
						class="text-sm {policy.violations > 0
							? 'text-red-600 dark:text-red-400 font-semibold'
							: 'text-gray-600 dark:text-gray-400'}"
					>
						{policy.violations}
					</span>
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{new Date(policy.created_at).toLocaleDateString()}
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
					<button
						type="button"
						onclick={() => onEdit?.(policy.id)}
						class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
					>
						Edit
					</button>
					<button
						type="button"
						class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
					>
						Delete
					</button>
				</td>
			{/snippet}
		</Table>

		<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
			<Pagination bind:currentPage {totalPages} {onPageChange} />
		</div>
	</div>
</div>
