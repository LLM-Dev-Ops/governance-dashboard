<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { theme as themeStore } from '$lib/stores/theme';

	let auth = $state<{ user: any | null; isAuthenticated: boolean; isLoading: boolean }>({
		user: null,
		isAuthenticated: false,
		isLoading: true
	});

	authStore.subscribe((value) => {
		auth = value;
	});

	let user = $derived(auth.user);
	let showUserMenu = $state(false);

	function toggleTheme() {
		themeStore.toggle();
	}

	function handleLogout() {
		authStore.logout();
	}
</script>

<nav class="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
	<div class="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Logo -->
			<div class="flex items-center">
				<a href="/dashboard" class="flex items-center gap-2">
					<svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
						/>
					</svg>
					<span class="text-xl font-bold text-gray-900 dark:text-white">LLM Governance</span>
				</a>
			</div>

			<!-- Right side actions -->
			<div class="flex items-center gap-4">
				<!-- Theme toggle -->
				<button
					type="button"
					onclick={toggleTheme}
					class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
					aria-label="Toggle theme"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
						></path>
					</svg>
				</button>

				<!-- Notifications -->
				<button
					type="button"
					class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
					aria-label="Notifications"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
						/>
					</svg>
					<span
						class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"
					></span>
				</button>

				<!-- User menu -->
				<div class="relative">
					<button
						type="button"
						onclick={() => (showUserMenu = !showUserMenu)}
						class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						<div
							class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium"
						>
							{user?.email?.[0]?.toUpperCase() || 'U'}
						</div>
						<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>

					{#if showUserMenu}
						<div
							class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
						>
							<div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
								<p class="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
							</div>
							<a
								href="/profile"
								class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								Profile
							</a>
							<a
								href="/settings"
								class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								Settings
							</a>
							<button
								type="button"
								onclick={handleLogout}
								class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								Sign out
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</nav>
