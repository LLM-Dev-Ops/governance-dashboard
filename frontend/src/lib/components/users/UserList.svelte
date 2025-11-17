<script lang="ts">
	import Table from '../common/Table.svelte';
	import Pagination from '../common/Pagination.svelte';
	import Badge from '../common/Badge.svelte';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';

	interface User {
		id: string;
		email: string;
		full_name: string;
		role: string;
		team: string;
		status: 'active' | 'inactive' | 'suspended';
		last_login: string;
	}

	interface Props {
		users?: User[];
		loading?: boolean;
		totalPages?: number;
		onPageChange?: (page: number) => void;
		onSearch?: (query: string) => void;
		onCreate?: () => void;
		onEdit?: (id: string) => void;
		class?: string;
	}

	let {
		users = [],
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
		{ key: 'email', label: 'Email', sortable: true },
		{ key: 'role', label: 'Role', sortable: true },
		{ key: 'team', label: 'Team', sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'last_login', label: 'Last Login', sortable: true },
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
			case 'suspended':
				return 'error';
			default:
				return 'neutral';
		}
	};
</script>

<div class="{className}">
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
		<Button onclick={onCreate}>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add User
		</Button>
	</div>

	<div class="mb-6">
		<Input
			type="search"
			bind:value={searchQuery}
			placeholder="Search users by name or email..."
			oninput={handleSearch}
		/>
	</div>

	<div class="bg-white dark:bg-gray-800 rounded-lg shadow">
		<Table {columns} data={users} {loading}>
			{#snippet children(user: User)}
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="flex items-center">
						<div
							class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium"
						>
							{user.full_name.charAt(0).toUpperCase()}
						</div>
						<div class="ml-4">
							<div class="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</div>
						</div>
					</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<Badge variant="info">{user.role}</Badge>
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{user.team}
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<Badge variant={statusVariant(user.status)}>{user.status}</Badge>
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
					{new Date(user.last_login).toLocaleDateString()}
				</td>
				<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
					<button
						type="button"
						onclick={() => onEdit?.(user.id)}
						class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
					>
						Edit
					</button>
					<button
						type="button"
						class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
					>
						Deactivate
					</button>
				</td>
			{/snippet}
		</Table>

		<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
			<Pagination bind:currentPage {totalPages} {onPageChange} />
		</div>
	</div>
</div>
