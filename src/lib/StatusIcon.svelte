<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { testruns } from './server/db/schema';

	interface Props {
		outcome: (typeof testruns.$inferSelect)['outcome'];
		/** If true, a null outcome will be considered as "in progress", otherwise it will be considered as "interrupted" */
		inProgress?: boolean;
		children?: Snippet<[]>;
	}

	const { outcome, children, inProgress }: Props = $props();
</script>

{#if outcome === null && inProgress}
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
