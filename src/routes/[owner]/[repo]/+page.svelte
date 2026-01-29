<script lang="ts">
	import { resolve } from '$app/paths';
	import { basename } from '$lib/utils.js';
	import { formatDistanceToNow } from 'date-fns';
	import { projectsOfRepo, repository, testsOfRepoByFilename } from './data.remote.js';
	import { browser } from '$app/environment';

	const { params } = $props();

	const { id, githubId } = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(id));
	const testsByFile = $derived(await testsOfRepoByFilename(id));

	$effect(() => {
		if (!browser) return;

		const updates = new EventSource(
			resolve('/subscribe/repositories/[repository=integer]', {
				repository: githubId.toString()
			})
		);

		updates.onmessage = (event) => {
			console.log('Got update!', event.data);
		};
	});
</script>

<h1>{params.owner}/{params.repo}</h1>

<h2>Projects</h2>

<ul>
	{#each projects as [id, project] (id)}
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
					{#each tests as { title, path, runs, stepsCount, id } (id)}
						{@const ongoing = runs.find((run) => !run.outcome)}
						<li>
							[{stepsCount}]

							{#if ongoing}
								<code title={formatDistanceToNow(ongoing.startedAt, { addSuffix: true })}>
									[ONGOING]
								</code>
							{/if}
							<a
								href={resolve('/[owner]/[repo]/[...test]', {
									...params,
									test: [filepath.slice(1), ...path, title].join('/')
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
