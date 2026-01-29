<script lang="ts">
	import { getTest } from './data.remote.js';

	const { params } = $props();
	const test = $derived(await getTest(params));
</script>
