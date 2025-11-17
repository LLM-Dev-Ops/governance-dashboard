<script lang="ts">
	import { z } from 'zod';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import Select from '../common/Select.svelte';
	import ErrorMessage from '../common/ErrorMessage.svelte';

	const userSchema = z.object({
		email: z.string().email('Invalid email address'),
		full_name: z.string().min(2, 'Name must be at least 2 characters'),
		role: z.string().min(1, 'Please select a role'),
		team: z.string().min(1, 'Please select a team')
	});

	interface Props {
		user?: any;
		onSave?: (data: any) => void;
		onCancel?: () => void;
		loading?: boolean;
		class?: string;
	}

	let { user, onSave, onCancel, loading = false, class: className = '' }: Props = $props();

	let email = $state(user?.email || '');
	let fullName = $state(user?.full_name || '');
	let role = $state(user?.role || '');
	let team = $state(user?.team || '');
	let error = $state('');
	let errors = $state<Record<string, string>>({});

	const roleOptions = [
		{ value: '', label: 'Select Role' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'developer', label: 'Developer' },
		{ value: 'viewer', label: 'Viewer' }
	];

	const teamOptions = [
		{ value: '', label: 'Select Team' },
		{ value: 'engineering', label: 'Engineering' },
		{ value: 'product', label: 'Product' },
		{ value: 'data', label: 'Data Science' },
		{ value: 'operations', label: 'Operations' }
	];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errors = {};
		error = '';

		const result = userSchema.safeParse({ email, full_name: fullName, role, team });
		if (!result.success) {
			result.error.issues.forEach((err) => {
				errors[err.path[0] as string] = err.message;
			});
			return;
		}

		onSave?.({ email, full_name: fullName, role, team });
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
		{user ? 'Edit User' : 'Add New User'}
	</h2>

	{#if error}
		<ErrorMessage message={error} class="mb-4" />
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<Input
			type="email"
			label="Email"
			bind:value={email}
			placeholder="user@company.com"
			required
			error={errors.email}
			autocomplete="email"
		/>

		<Input
			label="Full Name"
			bind:value={fullName}
			placeholder="John Doe"
			required
			error={errors.full_name}
			autocomplete="name"
		/>

		<div class="grid grid-cols-2 gap-4">
			<Select label="Role" bind:value={role} options={roleOptions} required error={errors.role} />

			<Select label="Team" bind:value={team} options={teamOptions} required error={errors.team} />
		</div>

		<div class="flex justify-end gap-3">
			<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
			<Button type="submit" {loading}>{user ? 'Update' : 'Create'} User</Button>
		</div>
	</form>
</div>
