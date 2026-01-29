<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		url: URL;
		children: Snippet;
	}

	const { url, children }: Props = $props();
</script>

<a rel="external" target="_blank" href={url.toString()}>{@render children()}</a>
