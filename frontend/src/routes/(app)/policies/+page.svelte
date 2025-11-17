<script lang="ts">
	import { goto } from '$app/navigation';
	import PolicyList from '$lib/components/policy/PolicyList.svelte';
	import ComplianceStatus from '$lib/components/policy/ComplianceStatus.svelte';

	// Sample data
	const policies = [
		{
			id: '1',
			name: 'Data Privacy Policy',
			description: 'Ensures PII data is not sent to LLM models',
			status: 'active' as const,
			violations: 3,
			created_at: '2024-01-15T10:00:00Z'
		},
		{
			id: '2',
			name: 'Cost Control Policy',
			description: 'Limits daily spending per user to $100',
			status: 'active' as const,
			violations: 0,
			created_at: '2024-01-20T10:00:00Z'
		},
		{
			id: '3',
			name: 'Model Access Policy',
			description: 'Restricts access to GPT-4 to approved users only',
			status: 'active' as const,
			violations: 1,
			created_at: '2024-02-01T10:00:00Z'
		}
	];

	const complianceData = {
		total_policies: 15,
		active_policies: 12,
		violations: 4,
		compliance_score: 94,
		status: 'compliant' as const
	};

	function handleCreate() {
		goto('/policies/new');
	}

	function handleEdit(id: string) {
		goto(`/policies/${id}/edit`);
	}

	function handleSearch(query: string) {
		console.log('Search:', query);
	}

	function handlePageChange(page: number) {
		console.log('Page:', page);
	}
</script>

<svelte:head>
	<title>Policies - LLM Governance</title>
</svelte:head>

<div class="space-y-6">
	<ComplianceStatus data={complianceData} />

	<PolicyList
		{policies}
		totalPages={3}
		onCreate={handleCreate}
		onEdit={handleEdit}
		onSearch={handleSearch}
		onPageChange={handlePageChange}
	/>
</div>
