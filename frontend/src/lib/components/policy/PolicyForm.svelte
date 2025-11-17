<script lang="ts">
	import { z } from 'zod';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import Select from '../common/Select.svelte';
	import ErrorMessage from '../common/ErrorMessage.svelte';

	const policySchema = z.object({
		name: z.string().min(3, 'Name must be at least 3 characters'),
		description: z.string().min(10, 'Description must be at least 10 characters'),
		status: z.enum(['active', 'inactive', 'draft']),
		priority: z.enum(['low', 'medium', 'high', 'critical'])
	});

	interface Props {
		policy?: any;
		onSave?: (data: any) => void;
		onCancel?: () => void;
		loading?: boolean;
		class?: string;
	}

	let { policy, onSave, onCancel, loading = false, class: className = '' }: Props = $props();

	let name = $state(policy?.name || '');
	let description = $state(policy?.description || '');
	let status = $state(policy?.status || 'draft');
	let priority = $state(policy?.priority || 'medium');
	let error = $state('');
	let errors = $state<Record<string, string>>({});

	const statusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' },
		{ value: 'draft', label: 'Draft' }
	];

	const priorityOptions = [
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'critical', label: 'Critical' }
	];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errors = {};
		error = '';

		const result = policySchema.safeParse({ name, description, status, priority });
		if (!result.success) {
			result.error.issues.forEach((err) => {
				errors[err.path[0] as string] = err.message;
			});
			return;
		}

		onSave?.({ name, description, status, priority });
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
		{policy ? 'Edit Policy' : 'Create New Policy'}
	</h2>

	{#if error}
		<ErrorMessage message={error} class="mb-4" />
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<Input
			label="Policy Name"
			bind:value={name}
			placeholder="Enter policy name"
			required
			error={errors.name}
		/>

		<div>
			<label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
				Description
				<span class="text-red-500">*</span>
			</label>
			<textarea
				bind:value={description}
				placeholder="Describe the policy purpose and scope"
				required
				rows="4"
				class="block w-full px-4 py-2 text-gray-900 bg-white border {errors.description
					? 'border-red-500'
					: 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
			></textarea>
			{#if errors.description}
				<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
			{/if}
		</div>

		<div class="grid grid-cols-2 gap-4">
			<Select
				label="Status"
				bind:value={status}
				options={statusOptions}
				required
				error={errors.status}
			/>

			<Select
				label="Priority"
				bind:value={priority}
				options={priorityOptions}
				required
				error={errors.priority}
			/>
		</div>

		<div class="flex justify-end gap-3">
			<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
			<Button type="submit" {loading}>{policy ? 'Update' : 'Create'} Policy</Button>
		</div>
	</form>
</div>
