<script lang="ts">
	import CostOverview from '$lib/components/cost/CostOverview.svelte';
	import CostBreakdown from '$lib/components/cost/CostBreakdown.svelte';
	import BudgetManager from '$lib/components/cost/BudgetManager.svelte';
	import CostForecast from '$lib/components/cost/CostForecast.svelte';
	import CostAlerts from '$lib/components/cost/CostAlerts.svelte';

	const costData = {
		total_cost: 12847.52,
		monthly_cost: 2847.32,
		daily_cost: 95.78,
		budget_used: 78,
		cost_change: 12.5
	};

	const breakdownData = [
		{ category: 'GPT-4', cost: 1250.5, percentage: 44 },
		{ category: 'GPT-3.5', cost: 850.2, percentage: 30 },
		{ category: 'Claude', cost: 450.8, percentage: 16 },
		{ category: 'Other', cost: 296.32, percentage: 10 }
	];

	const budgets = [
		{
			id: '1',
			name: 'Monthly Team Budget',
			amount: 5000,
			period: 'monthly',
			current_spend: 3900,
			alert_threshold: 80,
			status: 'warning' as const
		},
		{
			id: '2',
			name: 'Daily Limit',
			amount: 200,
			period: 'daily',
			current_spend: 95.78,
			alert_threshold: 90,
			status: 'ok' as const
		}
	];

	const forecastData = {
		historical: [
			{ date: 'Jan 1', cost: 2200 },
			{ date: 'Jan 8', cost: 2400 },
			{ date: 'Jan 15', cost: 2600 },
			{ date: 'Jan 22', cost: 2800 }
		],
		forecast: [
			{ date: 'Jan 29', cost: 3000 },
			{ date: 'Feb 5', cost: 3200 },
			{ date: 'Feb 12', cost: 3400 }
		]
	};

	const alerts = [
		{
			id: '1',
			budget_name: 'Monthly Team Budget',
			threshold: 80,
			current_usage: 78,
			severity: 'warning' as const,
			message: 'You have used 78% of your monthly budget. Consider optimizing usage.',
			timestamp: '2024-01-15T10:00:00Z'
		}
	];

	function handleSaveBudget(budget: any) {
		console.log('Save budget:', budget);
	}

	function handleDeleteBudget(id: string) {
		console.log('Delete budget:', id);
	}

	function handleDismissAlert(id: string) {
		console.log('Dismiss alert:', id);
	}
</script>

<svelte:head>
	<title>Cost Tracking - LLM Governance</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Cost Tracking</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Monitor and manage your LLM usage costs
		</p>
	</div>

	<CostOverview data={costData} />

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<CostBreakdown data={breakdownData} />
		<CostAlerts {alerts} onDismiss={handleDismissAlert} />
	</div>

	<CostForecast data={forecastData} />

	<BudgetManager {budgets} onSave={handleSaveBudget} onDelete={handleDeleteBudget} />
</div>
