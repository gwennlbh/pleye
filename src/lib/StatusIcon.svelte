<script lang="ts">
	import type { Snippet } from 'svelte';
	import StatusIcon from './StatusIcon.svelte';
	import type { results, testruns } from './server/db/schema';

	type OutcomeOrStatus =
		| { outcome: (typeof testruns.$inferSelect)['outcome'] }
		| { status: (typeof results.$inferSelect)['status'] };

	type Props = {
		/** If true, a null outcome will be considered as "in progress", otherwise it will be considered as "interrupted" */
		inProgress?: boolean;
		children?: Snippet<[]>;
	} & OutcomeOrStatus;

	const { children, inProgress, ...outcomeOrStatus }: Props = $props();

	const outcome = $derived('outcome' in outcomeOrStatus ? outcomeOrStatus.outcome : undefined);
	const status = $derived('status' in outcomeOrStatus ? outcomeOrStatus.status : undefined);

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

{#if status !== undefined}
	<StatusIcon {children} {inProgress} outcome={statusToOutcome(status)} />
{:else if outcome === null && inProgress}
	<span>… {@render children?.()}</span>
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
