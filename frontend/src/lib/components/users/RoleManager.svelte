<script lang="ts">
	import Badge from '../common/Badge.svelte';
	import Button from '../common/Button.svelte';
	import Modal from '../common/Modal.svelte';

	interface Role {
		id: string;
		name: string;
		description: string;
		permissions: string[];
		user_count: number;
	}

	interface Props {
		roles?: Role[];
		onAssign?: (userId: string, roleId: string) => void;
		class?: string;
	}

	let { roles = [], onAssign, class: className = '' }: Props = $props();

	let showModal = $state(false);
	let selectedRole = $state<Role | null>(null);

	function viewPermissions(role: Role) {
		selectedRole = role;
		showModal = true;
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Role Management</h3>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each roles as role}
			<div
				class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
			>
				<div class="flex items-start justify-between mb-3">
					<div>
						<h4 class="font-semibold text-gray-900 dark:text-white">{role.name}</h4>
						<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{role.description}</p>
					</div>
					<Badge variant="info">{role.user_count}</Badge>
				</div>

				<div class="mb-3">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Permissions:</p>
					<div class="flex flex-wrap gap-1">
						{#each role.permissions.slice(0, 3) as permission}
							<Badge variant="neutral" size="sm">{permission}</Badge>
						{/each}
						{#if role.permissions.length > 3}
							<Badge variant="neutral" size="sm">+{role.permissions.length - 3} more</Badge>
						{/if}
					</div>
				</div>

				<Button variant="outline" size="sm" fullWidth onclick={() => viewPermissions(role)}>
					View Permissions
				</Button>
			</div>
		{/each}
	</div>
</div>

<Modal bind:open={showModal} title="Role Permissions" size="md">
	{#if selectedRole}
		<div class="space-y-4">
			<div>
				<h4 class="font-semibold text-gray-900 dark:text-white">{selectedRole.name}</h4>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedRole.description}</p>
			</div>

			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
					Permissions ({selectedRole.permissions.length})
				</label>
				<div class="space-y-2">
					{#each selectedRole.permissions as permission}
						<div
							class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
						>
							<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="text-sm text-gray-900 dark:text-white">{permission}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</Modal>
