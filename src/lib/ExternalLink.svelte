<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		url: URL;
		children: Snippet;
		sneaky?: boolean;
	}

	const { url, children, sneaky = false }: Props = $props();
</script>

<a class:sneaky rel="external" target="_blank" href={url.toString()}>{@render children()}</a>
