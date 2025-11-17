<script lang="ts">
	import Table from '../common/Table.svelte';
	import Pagination from '../common/Pagination.svelte';
	import Badge from '../common/Badge.svelte';
	import Modal from '../common/Modal.svelte';

	interface Violation {
		id: string;
		policy_name: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
		user: string;
		description: string;
		timestamp: string;
	}

	interface Props {
		violations?: Violation[];
		loading?: boolean;
		totalPages?: number;
		onPageChange?: (page: number) => void;
		class?: string;
	}

	let {
		violations = [],
		loading = false,
		totalPages = 1,
		onPageChange,
		class: className = ''
	}: Props = $props();

	let currentPage = $state(1);
	let selectedViolation = $state<Violation | null>(null);
	let showDetailModal = $state(false);

	const columns = [
		{ key: 'policy', label: 'Policy', sortable: true },
		{ key: 'severity', label: 'Severity', sortable: true },
		{ key: 'user', label: 'User', sortable: true },
		{ key: 'description', label: 'Description' },
		{ key: 'timestamp', label: 'Timestamp', sortable: true },
		{ key: 'actions', label: 'Actions' }
	];

	const severityVariant = (severity: string) => {
		switch (severity) {
			case 'critical':
				return 'error';
			case 'high':
				return 'error';
			case 'medium':
				return 'warning';
			case 'low':
				return 'info';
			default:
				return 'neutral';
		}
	};

	function viewDetails(violation: Violation) {
		selectedViolation = violation;
		showDetailModal = true;
	}
</script>

<div class="{className}">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Policy Violations</h2>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
			Track and manage policy violations across your organization
		</p>
	</div>

	<div class="bg-white dark:bg-gray-800 rounded-lg shadow">
		<Table {columns} data={violations} {loading}>
			{#snippet children(violation: Violation)}
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm font-medium text-gray-900 dark:text-white">
						{violation.policy_name}
					</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<Badge variant={severityVariant(violation.severity)}>
						{violation.severity}
					</Badge>
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{violation.user}
				</td>
				<td class="px-6 py-4">
					<div class="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
						{violation.description}
					</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{new Date(violation.timestamp).toLocaleString()}
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
					<button
						type="button"
						onclick={() => viewDetails(violation)}
						class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
					>
						Details
					</button>
				</td>
			{/snippet}
		</Table>

		<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
			<Pagination bind:currentPage {totalPages} {onPageChange} />
		</div>
	</div>
</div>

<Modal bind:open={showDetailModal} title="Violation Details" size="lg">
	{#if selectedViolation}
		<div class="space-y-4">
			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Policy</label>
				<p class="mt-1 text-gray-900 dark:text-white">{selectedViolation.policy_name}</p>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Severity</label>
				<div class="mt-1">
					<Badge variant={severityVariant(selectedViolation.severity)}>
						{selectedViolation.severity}
					</Badge>
				</div>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
				<p class="mt-1 text-gray-900 dark:text-white">{selectedViolation.user}</p>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
				<p class="mt-1 text-gray-900 dark:text-white">{selectedViolation.description}</p>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</label>
				<p class="mt-1 text-gray-900 dark:text-white">
					{new Date(selectedViolation.timestamp).toLocaleString()}
				</p>
			</div>
		</div>
	{/if}
</Modal>
