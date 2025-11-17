<script lang="ts">
	import Button from '../common/Button.svelte';
	import Select from '../common/Select.svelte';
	import Input from '../common/Input.svelte';
	import Badge from '../common/Badge.svelte';

	interface Rule {
		id: string;
		field: string;
		operator: string;
		value: string;
		action: string;
	}

	interface Props {
		rules?: Rule[];
		onUpdate?: (rules: Rule[]) => void;
		class?: string;
	}

	let { rules = $bindable([]), onUpdate, class: className = '' }: Props = $props();

	const fieldOptions = [
		{ value: 'model', label: 'Model Name' },
		{ value: 'user', label: 'User' },
		{ value: 'team', label: 'Team' },
		{ value: 'cost', label: 'Cost' },
		{ value: 'tokens', label: 'Tokens' },
		{ value: 'prompt', label: 'Prompt Content' }
	];

	const operatorOptions = [
		{ value: 'equals', label: 'Equals' },
		{ value: 'not_equals', label: 'Not Equals' },
		{ value: 'contains', label: 'Contains' },
		{ value: 'not_contains', label: 'Does Not Contain' },
		{ value: 'greater_than', label: 'Greater Than' },
		{ value: 'less_than', label: 'Less Than' }
	];

	const actionOptions = [
		{ value: 'allow', label: 'Allow' },
		{ value: 'deny', label: 'Deny' },
		{ value: 'warn', label: 'Warn' },
		{ value: 'log', label: 'Log Only' }
	];

	function addRule() {
		const newRule: Rule = {
			id: Date.now().toString(),
			field: 'model',
			operator: 'equals',
			value: '',
			action: 'allow'
		};
		rules = [...rules, newRule];
		onUpdate?.(rules);
	}

	function removeRule(id: string) {
		rules = rules.filter((r) => r.id !== id);
		onUpdate?.(rules);
	}

	function updateRule(id: string, updates: Partial<Rule>) {
		rules = rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
		onUpdate?.(rules);
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<div class="flex items-center justify-between mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Policy Rules</h3>
		<Button variant="outline" size="sm" onclick={addRule}>
			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Rule
		</Button>
	</div>

	{#if rules.length === 0}
		<div
			class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
		>
			<svg
				class="w-12 h-12 mx-auto text-gray-400 mb-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 6v6m0 0v6m0-6h6m-6 0H6"
				/>
			</svg>
			<p class="text-gray-600 dark:text-gray-400 mb-4">No rules defined yet</p>
			<Button onclick={addRule}>Create First Rule</Button>
		</div>
	{:else}
		<div class="space-y-4">
			{#each rules as rule, index}
				<div
					class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
				>
					<div class="flex items-start gap-3 mb-3">
						<Badge variant="neutral" size="sm">Rule {index + 1}</Badge>
						<button
							type="button"
							onclick={() => removeRule(rule.id)}
							class="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
						<Select
							label="Field"
							bind:value={rule.field}
							options={fieldOptions}
							onchange={() => updateRule(rule.id, { field: rule.field })}
						/>

						<Select
							label="Operator"
							bind:value={rule.operator}
							options={operatorOptions}
							onchange={() => updateRule(rule.id, { operator: rule.operator })}
						/>

						<Input
							label="Value"
							bind:value={rule.value}
							placeholder="Enter value"
							onchange={() => updateRule(rule.id, { value: rule.value })}
						/>

						<Select
							label="Action"
							bind:value={rule.action}
							options={actionOptions}
							onchange={() => updateRule(rule.id, { action: rule.action })}
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if rules.length > 0}
		<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
			<h4 class="font-medium text-blue-900 dark:text-blue-200 mb-2">Rule Logic</h4>
			<p class="text-sm text-blue-800 dark:text-blue-300">
				Rules are evaluated in order. The first matching rule determines the action.
			</p>
		</div>
	{/if}
</div>
