<script lang="ts">
	import Badge from '../common/Badge.svelte';

	interface Permission {
		resource: string;
		actions: string[];
		granted_by: string;
	}

	interface Props {
		permissions?: Permission[];
		userId?: string;
		class?: string;
	}

	let { permissions = [], userId, class: className = '' }: Props = $props();

	const groupedPermissions = $derived(() => {
		return permissions.reduce(
			(acc, perm) => {
				if (!acc[perm.resource]) {
					acc[perm.resource] = [];
				}
				acc[perm.resource].push(...perm.actions);
				return acc;
			},
			{} as Record<string, string[]>
		);
	});
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
		Effective Permissions
	</h3>

	{#if permissions.length === 0}
		<div class="text-center py-8">
			<svg
				class="w-12 h-12 mx-auto text-gray-400 mb-2"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
				/>
			</svg>
			<p class="text-gray-500 dark:text-gray-400">No permissions assigned</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each Object.entries(groupedPermissions()) as [resource, actions]}
				<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
					<h4 class="font-medium text-gray-900 dark:text-white mb-3 capitalize">{resource}</h4>
					<div class="flex flex-wrap gap-2">
						{#each actions as action}
							<div
								class="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm"
							>
								<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="text-green-900 dark:text-green-200 font-medium">{action}</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
			<p class="text-sm text-blue-800 dark:text-blue-200">
				Permissions are inherited from assigned roles and teams. Changes to role permissions will
				automatically apply to this user.
			</p>
		</div>
	{/if}
</div>
