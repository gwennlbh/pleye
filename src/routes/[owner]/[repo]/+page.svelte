<script lang="ts">
	import { resolve } from '$app/paths';
	import { basename } from '$lib/utils.js';
	import { formatDistanceToNow } from 'date-fns';
	import { flakyTests, projectsOfRepo, repository, testsOfRepoByFilename } from './data.remote.js';

	const { params } = $props();

	const { id, githubId } = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(id));
	const testsByFile = $derived(await testsOfRepoByFilename(id));
	const flakies = $derived(await flakyTests(id));
</script>

<h1>{params.owner}/{params.repo}</h1>

<h2>Projects</h2>

<ul>
	{#each projects as [id, project] (id)}
		<li>{project.name}</li>
	{/each}
</ul>

<h2>Flakies</h2>

<ul>
	{#each flakies as test (test.id)}
		{@const projectIds = new Set(test.testruns.map((tr) => tr.projectId))}
		<li>
			<a
				href={resolve('/[owner]/[repo]/[...test]', {
					...params,
					test: [test.filePath.slice(1), ...test.path, test.title].join('/')
				})}
			>
				{test.title}
			</a>
			({test.testruns.length} times) on
			{#each projectIds as id, i (id)}
				{#if i > 0},
				{/if}
				{@const { name } = projects.get(id)!}
				<a
					href={resolve('/[owner]/[repo]/projects/[project]', {
						...params,
						project: name
					})}
				>
					{name}
				</a>
			{/each}
		</li>
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
					{#each tests as { title, path, testruns, stepsCount, id } (id)}
						{@const ongoing = testruns.find(
							(tr) =>
								tr.run.status === 'in_progress' && tr.duration === null && tr.outcome !== 'skipped'
						)}
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
