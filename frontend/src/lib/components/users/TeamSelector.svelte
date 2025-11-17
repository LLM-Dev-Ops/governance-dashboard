<script lang="ts">
	interface Team {
		id: string;
		name: string;
		description: string;
		member_count: number;
	}

	interface Props {
		teams?: Team[];
		selectedTeams?: string[];
		onSelect?: (teamIds: string[]) => void;
		multiSelect?: boolean;
		class?: string;
	}

	let {
		teams = [],
		selectedTeams = $bindable([]),
		onSelect,
		multiSelect = true,
		class: className = ''
	}: Props = $props();

	function toggleTeam(teamId: string) {
		if (multiSelect) {
			if (selectedTeams.includes(teamId)) {
				selectedTeams = selectedTeams.filter((id) => id !== teamId);
			} else {
				selectedTeams = [...selectedTeams, teamId];
			}
		} else {
			selectedTeams = [teamId];
		}
		onSelect?.(selectedTeams);
	}

	function isSelected(teamId: string): boolean {
		return selectedTeams.includes(teamId);
	}
</script>

<div class="{className}">
	<label class="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
		{multiSelect ? 'Select Teams' : 'Select Team'}
	</label>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		{#each teams as team}
			<button
				type="button"
				onclick={() => toggleTeam(team.id)}
				class="p-4 text-left border-2 rounded-lg transition-all {isSelected(team.id)
					? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
					: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
			>
				<div class="flex items-start justify-between mb-2">
					<h4 class="font-semibold text-gray-900 dark:text-white">{team.name}</h4>
					<div
						class="w-5 h-5 rounded border-2 flex items-center justify-center {isSelected(team.id)
							? 'border-blue-500 bg-blue-500'
							: 'border-gray-300 dark:border-gray-600'}"
					>
						{#if isSelected(team.id)}
							<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</div>
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400">{team.description}</p>
				<p class="text-xs text-gray-500 dark:text-gray-500 mt-2">{team.member_count} members</p>
			</button>
		{/each}
	</div>
</div>
