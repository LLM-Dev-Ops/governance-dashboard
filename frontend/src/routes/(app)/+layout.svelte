<script lang="ts">
	import DashboardLayout from '$lib/components/dashboard/DashboardLayout.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let { children } = $props();

	let auth = $state<{ user: any | null; isAuthenticated: boolean; isLoading: boolean }>({
		user: null,
		isAuthenticated: false,
		isLoading: true
	});

	const unsubscribe = authStore.subscribe((value) => {
		auth = value;
	});

	onMount(() => {
		// Check authentication
		if (!auth.isAuthenticated) {
			goto('/auth/login');
		}

		return () => unsubscribe();
	});
</script>

<DashboardLayout>
	{@render children?.()}
</DashboardLayout>
