<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	interface Props {
		data: T | undefined | null;
		summary: Snippet<[T]>;
		open?: boolean;
		children: Snippet<[]>;
	}

	const { data, summary, children, open = false }: Props = $props();
</script>

{#if data}
	<details {open}>
		<summary>
			{@render summary(data)}
		</summary>
		{@render children()}
	</details>
{:else}
	{@render children()}
{/if}
