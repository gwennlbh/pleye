<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { repository } from '../../data.remote.js';

	const { params } = $props();
	const repo = $derived(await repository(params));

	$effect(() => {
		if (!browser) return;

		const updates = new EventSource(
			resolve('/subscribe/repositories/[repository=integer]/runs/[run=integer]', {
				repository: repo.githubId.toString(),
				run: params.run
			})
		);

		updates.onmessage = (event) => {
			console.log('Got update!', event.data);
		};
	});
</script>
