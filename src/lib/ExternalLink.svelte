<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		url: URL;
		children: Snippet;
		sneaky?: boolean;
		title?: string;
	}

	const { url, children, sneaky = false, title }: Props = $props();
</script>

<a {title} class:sneaky rel="external" target="_blank" href={url.toString()}>{@render children()}</a>
