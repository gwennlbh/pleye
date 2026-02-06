<script lang="ts">
	import type { branches } from './server/db/schema';

	interface Props {
		state: (typeof branches.$inferSelect)['pullRequestState'];
	}

	const { state }: Props = $props();
</script>

{#if state === "automerge"}
	<span title="Auto-merge" class="accent">↓</span>
{:else if state === 'draft'}
	<span title="Draft" class="subdued">%</span>
{:else if state === 'open'}
	<span title="Open" class="success">·</span>
{:else if state === 'merged'}
	<span title="Merged" class="accent">✓</span>
{:else if state === 'closed'}
	<span title="Closed" class="failure">✗</span>
{:else}
	<span class="failure">?</span>
{/if}
