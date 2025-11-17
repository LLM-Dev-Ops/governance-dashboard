<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Badge from '../common/Badge.svelte';

	interface Metric {
		label: string;
		value: number;
		unit: string;
		status: 'success' | 'warning' | 'error' | 'neutral';
	}

	interface Props {
		websocketUrl?: string;
		class?: string;
	}

	let { websocketUrl = 'ws://localhost:8080/ws/metrics', class: className = '' }: Props = $props();

	let metrics = $state<Metric[]>([
		{ label: 'Active Requests', value: 0, unit: '', status: 'neutral' },
		{ label: 'Requests/sec', value: 0, unit: '/s', status: 'success' },
		{ label: 'Avg Response Time', value: 0, unit: 'ms', status: 'success' },
		{ label: 'Error Rate', value: 0, unit: '%', status: 'success' }
	]);

	let ws: WebSocket | null = null;
	let connected = $state(false);

	onMount(() => {
		connectWebSocket();
	});

	onDestroy(() => {
		if (ws) {
			ws.close();
		}
	});

	function connectWebSocket() {
		try {
			ws = new WebSocket(websocketUrl);

			ws.onopen = () => {
				connected = true;
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					updateMetrics(data);
				} catch (err: unknown) {
					console.error('Failed to parse WebSocket message:', err);
				}
			};

			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				connected = false;
			};

			ws.onclose = () => {
				connected = false;
				// Reconnect after 5 seconds
				setTimeout(connectWebSocket, 5000);
			};
		} catch (err: unknown) {
			console.error('Failed to connect to WebSocket:', err);
		}
	}

	function updateMetrics(data: any) {
		metrics = [
			{
				label: 'Active Requests',
				value: data.active_requests || 0,
				unit: '',
				status: data.active_requests > 100 ? 'warning' : 'neutral'
			},
			{
				label: 'Requests/sec',
				value: data.requests_per_sec || 0,
				unit: '/s',
				status: data.requests_per_sec > 50 ? 'warning' : 'success'
			},
			{
				label: 'Avg Response Time',
				value: data.avg_response_time || 0,
				unit: 'ms',
				status: data.avg_response_time > 1000 ? 'error' : 'success'
			},
			{
				label: 'Error Rate',
				value: data.error_rate || 0,
				unit: '%',
				status: data.error_rate > 5 ? 'error' : 'success'
			}
		];
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 {className}">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Real-Time Metrics</h3>
		<div class="flex items-center gap-2">
			<div
				class="w-2 h-2 rounded-full {connected
					? 'bg-green-500 animate-pulse'
					: 'bg-red-500'}"
			></div>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{connected ? 'Live' : 'Disconnected'}
			</span>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-4">
		{#each metrics as metric}
			<div
				class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
			>
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
					<Badge variant={metric.status} size="sm">
						{metric.status}
					</Badge>
				</div>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">
					{metric.value.toFixed(metric.unit === '%' || metric.unit === 'ms' ? 1 : 0)}{metric.unit}
				</p>
			</div>
		{/each}
	</div>

	{#if !connected}
		<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
			<p class="text-sm text-yellow-800 dark:text-yellow-200">
				Attempting to reconnect to live metrics...
			</p>
		</div>
	{/if}
</div>
