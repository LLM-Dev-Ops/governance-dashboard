<script lang="ts">
	import Navbar from '../common/Navbar.svelte';
	import Sidebar from '../common/Sidebar.svelte';

	interface Props {
		children?: any;
	}

	let { children }: Props = $props();
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<Navbar />
	<div class="flex">
		<Sidebar />
		<main class="flex-1 p-8">
			{@render children?.()}
		</main>
	</div>
</div>
