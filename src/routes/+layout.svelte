<script lang="ts" module>
	export const holdingKeys = $state({
		alt: false,
		shift: false,
		any() {
			return [...this].length > 0;
		},
		[Symbol.iterator]: function* (): Iterator<'alt' | 'shift'> {
			if (this.alt) yield 'alt';
			if (this.shift) yield 'shift';
		}
	});
</script>

<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/reset.css';
	import '$lib/global.css';

	let { children } = $props();

	function typingInInput() {
		const active = document.activeElement;
		return (
			active?.tagName === 'INPUT' ||
			active?.tagName === 'TEXTAREA' ||
			active?.getAttribute('contenteditable') === 'true'
		);
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (typingInInput()) return;
		// e.preventDefault();
		if (e.altKey) holdingKeys.alt = true;
		if (e.shiftKey) holdingKeys.shift = true;
	}}
	onkeyup={(e) => {
		if (typingInInput()) return;
		// e.preventDefault();
		if (!e.altKey) holdingKeys.alt = false;
		if (!e.shiftKey) holdingKeys.shift = false;
	}}
/>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:boundary>
	{@render children()}

	{#snippet onerror()}
		<h1>Oops!</h1>
	{/snippet}
</svelte:boundary>
