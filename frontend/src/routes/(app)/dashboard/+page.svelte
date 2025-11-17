<script lang="ts">
	import { onMount } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import MetricsCard from '$lib/components/dashboard/MetricsCard.svelte';
	import UsageChart from '$lib/components/dashboard/UsageChart.svelte';
	import CostTrendChart from '$lib/components/dashboard/CostTrendChart.svelte';
	import RecentAlerts from '$lib/components/dashboard/RecentAlerts.svelte';
	import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
	import RealTimeMetrics from '$lib/components/dashboard/RealTimeMetrics.svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/common/ErrorMessage.svelte';

	// Sample data - in production, this would come from API
	const metricsData = {
		usage: { value: '125.4K', change: 12.5, trend: 'up' as const },
		cost: { value: '$2,847', change: -5.2, trend: 'down' as const },
		violations: { value: '23', change: -15.3, trend: 'down' as const },
		users: { value: '1,247', change: 8.1, trend: 'up' as const }
	};

	const usageChartData = {
		labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		values: [12000, 19000, 15000, 22000, 18000, 25000, 21000]
	};

	const costChartData = {
		labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
		values: [450, 520, 480, 590]
	};

	const alerts = [
		{
			id: '1',
			title: 'Budget Alert',
			message: 'Monthly budget exceeded 80% threshold',
			severity: 'warning' as const,
			timestamp: '2 hours ago'
		},
		{
			id: '2',
			title: 'Policy Violation',
			message: 'Unauthorized model access detected',
			severity: 'error' as const,
			timestamp: '5 hours ago'
		},
		{
			id: '3',
			title: 'New User',
			message: 'New team member added to Engineering',
			severity: 'info' as const,
			timestamp: '1 day ago'
		}
	];
</script>

<svelte:head>
	<title>Dashboard - LLM Governance</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Welcome to your LLM Governance Dashboard
		</p>
	</div>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<MetricsCard
			title="Total API Calls"
			value={metricsData.usage.value}
			icon="usage"
			change={metricsData.usage.change}
			trend={metricsData.usage.trend}
		/>
		<MetricsCard
			title="Total Cost"
			value={metricsData.cost.value}
			icon="cost"
			change={metricsData.cost.change}
			trend={metricsData.cost.trend}
		/>
		<MetricsCard
			title="Policy Violations"
			value={metricsData.violations.value}
			icon="violations"
			change={metricsData.violations.change}
			trend={metricsData.violations.trend}
		/>
		<MetricsCard
			title="Active Users"
			value={metricsData.users.value}
			icon="users"
			change={metricsData.users.change}
			trend={metricsData.users.trend}
		/>
	</div>

	<!-- Charts Row -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<UsageChart data={usageChartData} />
		<CostTrendChart data={costChartData} />
	</div>

	<!-- Bottom Row -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2">
			<RecentAlerts {alerts} />
		</div>
		<QuickActions />
	</div>

	<!-- Real-time Metrics -->
	<RealTimeMetrics />
</div>
