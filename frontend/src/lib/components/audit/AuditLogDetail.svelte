<script lang="ts">
	import Modal from '../common/Modal.svelte';
	import Badge from '../common/Badge.svelte';

	interface AuditLogDetail {
		id: string;
		user: string;
		action: string;
		resource: string;
		status: 'success' | 'failure' | 'warning';
		ip_address: string;
		user_agent: string;
		request_body?: any;
		response_body?: any;
		timestamp: string;
	}

	interface Props {
		open?: boolean;
		log?: AuditLogDetail;
		onClose?: () => void;
	}

	let { open = $bindable(false), log, onClose }: Props = $props();

	const statusVariant = (status: string) => {
		switch (status) {
			case 'success':
				return 'success';
			case 'failure':
				return 'error';
			case 'warning':
				return 'warning';
			default:
				return 'neutral';
		}
	};
</script>

<Modal bind:open title="Audit Log Details" size="xl" {onClose}>
	{#if log}
		<div class="space-y-6">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
					<p class="mt-1 text-gray-900 dark:text-white">{log.user}</p>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
					<div class="mt-1">
						<Badge variant={statusVariant(log.status)}>{log.status}</Badge>
					</div>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
					<p class="mt-1 text-gray-900 dark:text-white">{log.action}</p>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Resource</label>
					<p class="mt-1 text-gray-900 dark:text-white">{log.resource}</p>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">IP Address</label>
					<p class="mt-1 text-gray-900 dark:text-white">{log.ip_address}</p>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</label>
					<p class="mt-1 text-gray-900 dark:text-white">
						{new Date(log.timestamp).toLocaleString()}
					</p>
				</div>
			</div>

			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">User Agent</label>
				<p class="mt-1 text-sm text-gray-900 dark:text-white break-all">{log.user_agent}</p>
			</div>

			{#if log.request_body}
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Request Body</label>
					<pre
						class="mt-1 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto text-sm">{JSON.stringify(
							log.request_body,
							null,
							2
						)}</pre>
				</div>
			{/if}

			{#if log.response_body}
				<div>
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Response Body</label>
					<pre
						class="mt-1 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto text-sm">{JSON.stringify(
							log.response_body,
							null,
							2
						)}</pre>
				</div>
			{/if}
		</div>
	{/if}
</Modal>
