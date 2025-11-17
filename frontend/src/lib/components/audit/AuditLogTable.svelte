<script lang="ts">
	import Table from '../common/Table.svelte';
	import Pagination from '../common/Pagination.svelte';
	import Badge from '../common/Badge.svelte';

	interface AuditLog {
		id: string;
		user: string;
		action: string;
		resource: string;
		status: 'success' | 'failure' | 'warning';
		ip_address: string;
		timestamp: string;
	}

	interface Props {
		logs?: AuditLog[];
		loading?: boolean;
		totalPages?: number;
		onPageChange?: (page: number) => void;
		onViewDetail?: (id: string) => void;
		class?: string;
	}

	let {
		logs = [],
		loading = false,
		totalPages = 1,
		onPageChange,
		onViewDetail,
		class: className = ''
	}: Props = $props();

	let currentPage = $state(1);

	const columns = [
		{ key: 'user', label: 'User', sortable: true },
		{ key: 'action', label: 'Action', sortable: true },
		{ key: 'resource', label: 'Resource', sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'ip', label: 'IP Address' },
		{ key: 'timestamp', label: 'Timestamp', sortable: true },
		{ key: 'actions', label: 'Actions' }
	];

	const statusVariant = (status: string) => {
		switch (status) {
			case 'success':
				return 'success';
			case 'failure':
				return 'error';
			case 'warning':
				return 'warning';
			default:
				return 'neutral';
		}
	};
</script>

<div class="{className}">
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow">
		<Table {columns} data={logs} {loading}>
			{#snippet children(log: AuditLog)}
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm font-medium text-gray-900 dark:text-white">{log.user}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm text-gray-600 dark:text-gray-400">{log.action}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm text-gray-600 dark:text-gray-400">{log.resource}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<Badge variant={statusVariant(log.status)}>{log.status}</Badge>
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{log.ip_address}
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{new Date(log.timestamp).toLocaleString()}
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
					<button
						type="button"
						onclick={() => onViewDetail?.(log.id)}
						class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
					>
						View
					</button>
				</td>
			{/snippet}
		</Table>

		<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
			<Pagination bind:currentPage {totalPages} {onPageChange} />
		</div>
	</div>
</div>
