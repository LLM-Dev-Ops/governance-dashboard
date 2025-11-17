<script lang="ts">
	import AuditLogTable from '$lib/components/audit/AuditLogTable.svelte';
	import AuditLogFilter from '$lib/components/audit/AuditLogFilter.svelte';
	import AuditLogDetail from '$lib/components/audit/AuditLogDetail.svelte';
	import AuditExport from '$lib/components/audit/AuditExport.svelte';
	import Button from '$lib/components/common/Button.svelte';

	let showExportModal = $state(false);
	let showDetailModal = $state(false);
	let selectedLog = $state<any>(null);

	const logs = [
		{
			id: '1',
			user: 'john@company.com',
			action: 'CREATE',
			resource: 'policy',
			status: 'success' as const,
			ip_address: '192.168.1.100',
			timestamp: '2024-01-15T10:30:00Z'
		},
		{
			id: '2',
			user: 'jane@company.com',
			action: 'UPDATE',
			resource: 'user',
			status: 'success' as const,
			ip_address: '192.168.1.101',
			timestamp: '2024-01-15T11:00:00Z'
		},
		{
			id: '3',
			user: 'bob@company.com',
			action: 'DELETE',
			resource: 'budget',
			status: 'failure' as const,
			ip_address: '192.168.1.102',
			timestamp: '2024-01-15T11:30:00Z'
		}
	];

	function handleFilter(criteria: any) {
		console.log('Filter:', criteria);
	}

	function handleReset() {
		console.log('Reset filters');
	}

	function handleViewDetail(id: string) {
		const log = logs.find((l) => l.id === id);
		if (log) {
			selectedLog = {
				...log,
				user_agent: 'Mozilla/5.0...',
				request_body: { name: 'Test Policy' },
				response_body: { success: true }
			};
			showDetailModal = true;
		}
	}

	function handleExport(format: string, startDate: string, endDate: string) {
		console.log('Export:', { format, startDate, endDate });
		return Promise.resolve();
	}

	function handlePageChange(page: number) {
		console.log('Page:', page);
	}
</script>

<svelte:head>
	<title>Audit Logs - LLM Governance</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Track all system activities and user actions
			</p>
		</div>
		<Button onclick={() => (showExportModal = true)}>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			Export Logs
		</Button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<div class="lg:col-span-1">
			<AuditLogFilter onFilter={handleFilter} onReset={handleReset} />
		</div>
		<div class="lg:col-span-3">
			<AuditLogTable
				{logs}
				totalPages={5}
				onViewDetail={handleViewDetail}
				onPageChange={handlePageChange}
			/>
		</div>
	</div>
</div>

<AuditLogDetail bind:open={showDetailModal} log={selectedLog} />
<AuditExport bind:open={showExportModal} onExport={handleExport} />
