<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		showClose?: boolean;
		onClose?: () => void;
		children?: any;
		footer?: any;
	}

	let {
		open = $bindable(false),
		title,
		size = 'md',
		showClose = true,
		onClose,
		children,
		footer
	}: Props = $props();

	const sizeStyles = {
		sm: 'max-w-md',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl',
		full: 'max-w-full mx-4'
	};

	function handleClose() {
		open = false;
		onClose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			handleClose();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="relative w-full {sizeStyles[
				size
			]} bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all m-4"
		>
			<!-- Header -->
			{#if title || showClose}
				<div
					class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"
				>
					{#if title}
						<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
					{/if}
					{#if showClose}
						<button
							type="button"
							class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
							onclick={handleClose}
							aria-label="Close modal"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<!-- Body -->
			<div class="px-6 py-4">
				{@render children?.()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div
					class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700"
				>
					{@render footer?.()}
				</div>
			{/if}
		</div>
	</div>
{/if}
