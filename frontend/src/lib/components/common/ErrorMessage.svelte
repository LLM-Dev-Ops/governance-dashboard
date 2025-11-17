<script lang="ts">
	interface Props {
		title?: string;
		message?: string;
		error?: Error | unknown;
		retry?: () => void;
		class?: string;
	}

	let {
		title = 'An error occurred',
		message,
		error,
		retry,
		class: className = ''
	}: Props = $props();

	let errorMessage = $derived(
		message || (error instanceof Error ? error.message : 'Something went wrong')
	);
</script>

<div
	class="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 {className}"
	role="alert"
>
	<div class="flex items-start gap-3">
		<svg
			class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<path
				fill-rule="evenodd"
				d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
				clip-rule="evenodd"
			/>
		</svg>
		<div class="flex-1">
			<h3 class="text-sm font-semibold text-red-800 dark:text-red-200">{title}</h3>
			<p class="mt-1 text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
			{#if retry}
				<button
					type="button"
					class="mt-3 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 underline"
					onclick={retry}
				>
					Try again
				</button>
			{/if}
		</div>
	</div>
</div>
