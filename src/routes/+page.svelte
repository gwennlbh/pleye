<script lang="ts">
	import { resolve } from '$app/paths';
	import { repositories } from './data.remote';

	const repos = $derived(await repositories());
</script>

<ul>
	{#each repos as repo}
		<li>
			<a
				href={resolve('/[owner]/[repo]', {
					owner: repo.githubOwner,
					repo: repo.githubRepo
				})}
			>
				{repo.githubOwner}/{repo.githubRepo}
			</a>
		</li>
	{/each}
</ul>
