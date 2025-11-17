<script lang="ts">
	import '../app.css';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutes
				refetchOnWindowFocus: false,
			},
		},
	});
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
	<Toaster position="top-right" richColors />
</QueryClientProvider>
