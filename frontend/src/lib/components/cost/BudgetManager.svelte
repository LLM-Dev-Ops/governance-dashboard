<script lang="ts">
	import { z } from 'zod';
	import Button from '../common/Button.svelte';
	import Input from '../common/Input.svelte';
	import Select from '../common/Select.svelte';
	import Badge from '../common/Badge.svelte';
	import Modal from '../common/Modal.svelte';

	const budgetSchema = z.object({
		name: z.string().min(3, 'Name must be at least 3 characters'),
		amount: z.number().positive('Amount must be positive'),
		period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
		alert_threshold: z.number().min(0).max(100)
	});

	interface Budget {
		id: string;
		name: string;
		amount: number;
		period: string;
		current_spend: number;
		alert_threshold: number;
		status: 'ok' | 'warning' | 'exceeded';
	}

	interface Props {
		budgets?: Budget[];
		onSave?: (budget: any) => void;
		onDelete?: (id: string) => void;
		class?: string;
	}

	let { budgets = [], onSave, onDelete, class: className = '' }: Props = $props();

	let showModal = $state(false);
	let editingBudget = $state<Budget | null>(null);
	let name = $state('');
	let amount = $state(0);
	let period = $state('monthly');
	let alertThreshold = $state(80);
	let errors = $state<Record<string, string>>({});

	const periodOptions = [
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly' }
	];

	function openCreateModal() {
		editingBudget = null;
		name = '';
		amount = 0;
		period = 'monthly';
		alertThreshold = 80;
		showModal = true;
	}

	function openEditModal(budget: Budget) {
		editingBudget = budget;
		name = budget.name;
		amount = budget.amount;
		period = budget.period;
		alertThreshold = budget.alert_threshold;
		showModal = true;
	}

	function handleSave() {
		errors = {};
		const result = budgetSchema.safeParse({
			name,
			amount,
			period,
			alert_threshold: alertThreshold
		});

		if (!result.success) {
			result.error.issues.forEach((err) => {
				errors[err.path[0] as string] = err.message;
			});
			return;
		}

		onSave?.({ id: editingBudget?.id, name, amount, period, alert_threshold: alertThreshold });
		showModal = false;
	}

	const statusVariant = (status: string) => {
		switch (status) {
			case 'ok':
				return 'success';
			case 'warning':
				return 'warning';
			case 'exceeded':
				return 'error';
			default:
				return 'neutral';
		}
	};
</script>

<div class="{className}">
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Budget Management</h2>
		<Button onclick={openCreateModal}>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Create Budget
		</Button>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each budgets as budget}
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div class="flex items-start justify-between mb-4">
					<div>
						<h3 class="font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 capitalize">{budget.period}</p>
					</div>
					<Badge variant={statusVariant(budget.status)}>{budget.status}</Badge>
				</div>

				<div class="mb-4">
					<div class="flex justify-between text-sm mb-1">
						<span class="text-gray-600 dark:text-gray-400">Used</span>
						<span class="font-medium text-gray-900 dark:text-white">
							${budget.current_spend} / ${budget.amount}
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
						<div
							class="h-2 rounded-full {budget.status === 'exceeded'
								? 'bg-red-600'
								: budget.status === 'warning'
									? 'bg-yellow-600'
									: 'bg-green-600'}"
							style="width: {Math.min((budget.current_spend / budget.amount) * 100, 100)}%"
						></div>
					</div>
				</div>

				<div class="flex gap-2">
					<Button variant="outline" size="sm" fullWidth onclick={() => openEditModal(budget)}>
						Edit
					</Button>
					<button
						type="button"
						onclick={() => onDelete?.(budget.id)}
						class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
					>
						Delete
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>

<Modal bind:open={showModal} title={editingBudget ? 'Edit Budget' : 'Create Budget'} size="md">
	<div class="space-y-4">
		<Input label="Budget Name" bind:value={name} required error={errors.name} />

		<Input
			type="number"
			label="Amount ($)"
			bind:value={amount}
			required
			error={errors.amount}
			min={0}
			step={0.01}
		/>

		<Select label="Period" bind:value={period} options={periodOptions} error={errors.period} />

		<Input
			type="number"
			label="Alert Threshold (%)"
			bind:value={alertThreshold}
			required
			error={errors.alert_threshold}
			min={0}
			max={100}
			helpText="Receive alerts when spending reaches this percentage"
		/>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (showModal = false)}>Cancel</Button>
		<Button onclick={handleSave}>{editingBudget ? 'Update' : 'Create'}</Button>
	{/snippet}
</Modal>
