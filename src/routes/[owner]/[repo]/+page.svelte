<script lang="ts">
	import { resolve } from '$app/paths';
	import { basename } from '$lib/utils.js';
	import { projectsOfRepo, repository, testsOfRepoByFilename } from './data.remote.js';

	const { params } = $props();

	const { id } = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(id));
	const testsByFile = $derived(await testsOfRepoByFilename(id));
</script>

<h1>{params.owner}/{params.repo}</h1>

<h2>Projects</h2>

<ul>
	{#each projects as project}
		<li>{project.name}</li>
	{/each}
</ul>

<h2>Tests</h2>

<ul>
	{#each testsByFile as [filepath, tests] (filepath)}
		<li>
			<details>
				<summary>
					{basename(filepath)} ({tests.length} tests)
				</summary>
				<ul>
					{#each tests as { title, path, id }}
						<li>
							<a
								href={resolve('/[owner]/[repo]/[test]', {
									...params,
									test: id.toString()
								})}
							>
								{[...path, title].join(' › ')}
							</a>
						</li>
					{/each}
				</ul>
			</details>
		</li>
	{/each}
</ul>
