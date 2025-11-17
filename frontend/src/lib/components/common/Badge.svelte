<script lang="ts">
	interface Props {
		variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: any;
	}

	let {
		variant = 'neutral',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	const baseStyles = 'inline-flex items-center font-medium rounded-full';

	const variantStyles = {
		success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
		error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
		info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
	};

	const sizeStyles = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-sm',
		lg: 'px-3 py-1.5 text-base'
	};

	const computedClass = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
</script>

<span class={computedClass}>
	{@render children?.()}
</span>
