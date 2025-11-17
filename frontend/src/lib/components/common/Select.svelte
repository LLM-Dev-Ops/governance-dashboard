<script lang="ts">
	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		value?: string | number;
		options: Option[];
		label?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		helpText?: string;
		id?: string;
		name?: string;
		class?: string;
		onchange?: (e: Event) => void;
	}

	let {
		value = $bindable(''),
		options,
		label,
		placeholder = 'Select an option',
		disabled = false,
		required = false,
		error,
		helpText,
		id,
		name,
		class: className = '',
		onchange
	}: Props = $props();

	const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

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
		<label for={selectId} class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<select
		id={selectId}
		{name}
		bind:value
		{disabled}
		{required}
		class={computedClass}
		{onchange}
	>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as option}
			<option value={option.value} disabled={option.disabled}>{option.label}</option>
		{/each}
	</select>

	{#if error}
		<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if helpText}
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
	{/if}
</div>
