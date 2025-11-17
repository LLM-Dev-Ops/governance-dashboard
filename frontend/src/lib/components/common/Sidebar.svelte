<script lang="ts">
	import { page } from '$app/stores';

	interface NavItem {
		label: string;
		href: string;
		icon: string;
		badge?: string;
	}

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
		{ label: 'Policies', href: '/policies', icon: 'policy' },
		{ label: 'Audit Logs', href: '/audit', icon: 'audit' },
		{ label: 'Cost Tracking', href: '/costs', icon: 'cost' },
		{ label: 'User Management', href: '/users', icon: 'users' }
	];

	function isActive(href: string): boolean {
		return $page.url.pathname.startsWith(href);
	}

	const icons: Record<string, string> = {
		dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		policy: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		audit: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
		cost: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
	};
</script>

<aside
	class="w-64 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 min-h-screen"
>
	<nav class="px-4 py-6 space-y-2">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors {isActive(
					item.href
				)
					? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
					: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d={icons[item.icon]}
					/>
				</svg>
				<span>{item.label}</span>
				{#if item.badge}
					<span
						class="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200"
					>
						{item.badge}
					</span>
				{/if}
			</a>
		{/each}
	</nav>
</aside>
