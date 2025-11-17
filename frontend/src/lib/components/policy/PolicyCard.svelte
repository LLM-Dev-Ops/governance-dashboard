<script lang="ts">
	import Badge from '../common/Badge.svelte';
	import Button from '../common/Button.svelte';

	interface Policy {
		id: string;
		name: string;
		description: string;
		status: 'active' | 'inactive' | 'draft';
		violations: number;
		rules_count: number;
		created_at: string;
	}

	interface Props {
		policy: Policy;
		onEdit?: (id: string) => void;
		onDelete?: (id: string) => void;
		onView?: (id: string) => void;
		class?: string;
	}

	let { policy, onEdit, onDelete, onView, class: className = '' }: Props = $props();

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

<div
	class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 {className}"
>
	<div class="p-6">
		<div class="flex items-start justify-between mb-4">
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{policy.name}</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">{policy.description}</p>
			</div>
			<Badge variant={statusVariant(policy.status)}>{policy.status}</Badge>
		</div>

		<div class="grid grid-cols-3 gap-4 mb-4">
			<div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{policy.rules_count}</p>
				<p class="text-xs text-gray-600 dark:text-gray-400">Rules</p>
			</div>
			<div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p
					class="text-2xl font-bold {policy.violations > 0
						? 'text-red-600 dark:text-red-400'
						: 'text-gray-900 dark:text-white'}"
				>
					{policy.violations}
				</p>
				<p class="text-xs text-gray-600 dark:text-gray-400">Violations</p>
			</div>
			<div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Created</p>
				<p class="text-sm font-medium text-gray-900 dark:text-white">
					{new Date(policy.created_at).toLocaleDateString()}
				</p>
			</div>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" size="sm" fullWidth onclick={() => onView?.(policy.id)}>
				View Details
			</Button>
			<Button variant="secondary" size="sm" fullWidth onclick={() => onEdit?.(policy.id)}>
				Edit
			</Button>
			<button
				type="button"
				onclick={() => onDelete?.(policy.id)}
				class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>
