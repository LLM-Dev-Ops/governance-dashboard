<script lang="ts">
	import { goto } from '$app/navigation';
	import UserList from '$lib/components/users/UserList.svelte';
	import RoleManager from '$lib/components/users/RoleManager.svelte';

	const users = [
		{
			id: '1',
			email: 'john.doe@company.com',
			full_name: 'John Doe',
			role: 'Admin',
			team: 'Engineering',
			status: 'active' as const,
			last_login: '2024-01-15T10:00:00Z'
		},
		{
			id: '2',
			email: 'jane.smith@company.com',
			full_name: 'Jane Smith',
			role: 'Manager',
			team: 'Product',
			status: 'active' as const,
			last_login: '2024-01-14T15:30:00Z'
		},
		{
			id: '3',
			email: 'bob.johnson@company.com',
			full_name: 'Bob Johnson',
			role: 'Developer',
			team: 'Engineering',
			status: 'inactive' as const,
			last_login: '2024-01-10T09:00:00Z'
		}
	];

	const roles = [
		{
			id: '1',
			name: 'Admin',
			description: 'Full system access with all permissions',
			permissions: [
				'users.create',
				'users.read',
				'users.update',
				'users.delete',
				'policies.create',
				'policies.update',
				'policies.delete',
				'audit.read',
				'costs.read'
			],
			user_count: 5
		},
		{
			id: '2',
			name: 'Manager',
			description: 'Team management and policy configuration',
			permissions: [
				'users.read',
				'policies.create',
				'policies.update',
				'audit.read',
				'costs.read'
			],
			user_count: 12
		},
		{
			id: '3',
			name: 'Developer',
			description: 'Standard access for developers',
			permissions: ['policies.read', 'audit.read', 'costs.read'],
			user_count: 45
		}
	];

	function handleCreate() {
		goto('/users/new');
	}

	function handleEdit(id: string) {
		goto(`/users/${id}/edit`);
	}

	function handleSearch(query: string) {
		console.log('Search:', query);
	}

	function handlePageChange(page: number) {
		console.log('Page:', page);
	}
</script>

<svelte:head>
	<title>User Management - LLM Governance</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Manage users, roles, and permissions
		</p>
	</div>

	<RoleManager {roles} />

	<UserList
		{users}
		totalPages={3}
		onCreate={handleCreate}
		onEdit={handleEdit}
		onSearch={handleSearch}
		onPageChange={handlePageChange}
	/>
</div>
