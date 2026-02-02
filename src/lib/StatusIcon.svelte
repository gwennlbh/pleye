<script lang="ts">
	import type { Snippet } from 'svelte';
	import StatusIcon from './StatusIcon.svelte';
	import type { results, runs, testruns } from './server/db/schema';

	type OutcomeOrStatus =
		| {
				outcome: (typeof testruns.$inferSelect)['outcome'];
				results?: (typeof results.$inferSelect)[];
		  }
		| { status: (typeof results.$inferSelect)['status'] }
		| {
				status: (typeof runs.$inferSelect)['status'];
				result: (typeof runs.$inferSelect)['result'];
		  };

	type Props = {
		/** If true, a null outcome will be considered as "in progress", otherwise it will be considered as "interrupted" */
		inProgress?: boolean;
		children?: Snippet<[]>;
	} & OutcomeOrStatus;

	const { children, inProgress, ...data }: Props = $props();

	const outcome = $derived('outcome' in data ? data.outcome : undefined);

	function statusToOutcome(
		status: (typeof results.$inferSelect)['status']
	): (typeof testruns.$inferSelect)['outcome'] {
		if (status === null) return null;

		switch (status) {
			case 'passed':
				return 'expected';
			case 'failed':
				return 'unexpected';
			case 'interrupted':
				return inProgress ? null : 'skipped';
			case 'skipped':
				return 'skipped';
			case 'timedOut':
				return 'unexpected';
		}
	}
</script>

{#if 'result' in data && data.status === 'completed'}
	<StatusIcon {children} status={data.result === 'timedout' ? 'timedOut' : data.result} />
{:else if 'result' in data}
	<StatusIcon {children} inProgress outcome={null} />
{:else if 'status' in data}
	<StatusIcon {children} {inProgress} outcome={statusToOutcome(data.status)} />
{:else if outcome === "skipped" && 'results' in data && data.results?.some(r => r.status === "interrupted")}
	<StatusIcon {children} outcome={null} />
{:else if outcome === null && inProgress}
	<span>⋯ {@render children?.()}</span>
{:else if outcome === null}
	<span class="failure">! {@render children?.()}</span>
{:else if outcome === 'expected'}
	<span class="success">✔ {@render children?.()}</span>
{:else if outcome === 'unexpected'}
	<span class="failure">✘ {@render children?.()}</span>
{:else if outcome === 'flaky'}
	<span class="warning">~ {@render children?.()}</span>
{:else if outcome === 'skipped'}
	<span class="subdued">— {@render children?.()}</span>
{/if}

<style>
	span {
		display: inline-block;
		width: 1ch;
	}
</style>
