<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time';
		value?: string | number;
		label?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		helpText?: string;
		id?: string;
		name?: string;
		class?: string;
		autocomplete?: string;
		min?: number;
		max?: number;
		step?: number;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		onblur?: (e: FocusEvent) => void;
	}

	let {
		type = 'text',
		value = $bindable(''),
		label,
		placeholder,
		disabled = false,
		required = false,
		error,
		helpText,
		id,
		name,
		class: className = '',
		autocomplete,
		min,
		max,
		step,
		oninput,
		onchange,
		onblur
	}: Props = $props();

	const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

	const baseStyles =
		'block w-full px-4 py-2 text-gray-900 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-800 dark:text-gray-100';

	const stateStyles = error
		? 'border-red-500 focus:ring-red-500 focus:border-red-500'
		: 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600';

	const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900' : '';

	const computedClass = `${baseStyles} ${stateStyles} ${disabledStyles} ${className}`;
</script>

<div class="w-full">
	{#if label}
		<label for={inputId} class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<input
		{type}
		id={inputId}
		{name}
		bind:value
		{placeholder}
		{disabled}
		{required}
		autocomplete={autocomplete as any}
		{min}
		{max}
		{step}
		class={computedClass}
		{oninput}
		{onchange}
		{onblur}
	/>

	{#if error}
		<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if helpText}
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
	{/if}
</div>
