<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	interface Props {
		detailsData: T | undefined | null;
		details: Snippet<[T]>;
        open?: boolean;
		children: Snippet<[]>;
	}

	const { detailsData, details, children: summary , open = false}: Props = $props();
</script>

{#if detailsData}
	<details {open}>
		<summary>
			{@render summary()}
		</summary>
		{@render details(detailsData)}
	</details>
{:else}
	{@render summary()}
{/if}
