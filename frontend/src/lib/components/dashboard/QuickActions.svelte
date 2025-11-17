<script lang="ts">
	import Button from '../common/Button.svelte';

	interface Action {
		label: string;
		icon: string;
		href: string;
		variant?: 'primary' | 'secondary' | 'outline';
	}

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	const actions: Action[] = [
		{
			label: 'Create Policy',
			icon: 'M12 4v16m8-8H4',
			href: '/policies/new',
			variant: 'primary'
		},
		{
			label: 'View Audit Logs',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			href: '/audit',
			variant: 'secondary'
		},
		{
			label: 'Export Report',
			icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			href: '/reports',
			variant: 'outline'
		},
		{
			label: 'Add User',
			icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
			href: '/users/new',
			variant: 'outline'
		}
	];
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
		{#each actions as action}
			<a href={action.href}>
				<Button variant={action.variant || 'outline'} fullWidth>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d={action.icon}
						/>
					</svg>
					{action.label}
				</Button>
			</a>
		{/each}
	</div>
</div>
