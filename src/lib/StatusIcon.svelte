<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { testruns } from './server/db/schema';

	interface Props {
		outcome: (typeof testruns.$inferSelect)['outcome'];
		children?: Snippet<[]>;
	}

	const { outcome, children }: Props = $props();
</script>

{#if outcome === 'expected'}
	<span class="success">✔ {@render children?.()}</span>
{:else if outcome === 'unexpected'}
	<span class="failure">✘ {@render children?.()}</span>
{:else if outcome === 'flaky'}
	<span class="warning">~ {@render children?.()}</span>
{:else if outcome === 'skipped'}
	<span class="subdued">— {@render children?.()}</span>
{/if}
