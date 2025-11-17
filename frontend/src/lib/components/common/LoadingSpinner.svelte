<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
		message?: string;
	}

	let { size = 'md', class: className = '', message }: Props = $props();

	const sizeStyles = {
		sm: 'w-4 h-4',
		md: 'w-8 h-8',
		lg: 'w-12 h-12',
		xl: 'w-16 h-16'
	};

	const computedClass = `${sizeStyles[size]} ${className}`;
</script>

<div class="flex flex-col items-center justify-center gap-3">
	<svg
		class="{computedClass} animate-spin text-blue-600 dark:text-blue-400"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
	>
		<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
		></circle>
		<path
			class="opacity-75"
			fill="currentColor"
			d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
		></path>
	</svg>
	{#if message}
		<p class="text-sm text-gray-600 dark:text-gray-400">{message}</p>
	{/if}
</div>
