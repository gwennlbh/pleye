<script lang="ts">
	import { resolve } from '$app/paths';
	import { basename } from '$lib/utils.js';
	import { formatDistanceToNow } from 'date-fns';
	import {
		branchesOfRepo,
		flakyTests,
		projectsOfRepo,
		repository,
		testsOfRepoByFilename
	} from './data.remote.js';
	import { linkToTest } from './[...test]/links.js';

	const { params } = $props();

	const { id } = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(id));
	const testsByFile = $derived(await testsOfRepoByFilename(id));
	const flakies = $derived(await flakyTests(id));
	const branches = $derived(await branchesOfRepo(id));
</script>

<h1>{params.owner}/{params.repo}</h1>

<section>
	<h2>Projects</h2>

	<ul>
		{#each projects as [id, project] (id)}
			<li>
				<a
					href={resolve('/[owner]/[repo]/projects/[project]', {
						...params,
						project: project.name
					})}
				>
					{project.name}
				</a>
			</li>
		{/each}
	</ul>
</section>

<section class="flakies">
	<h2>Flakies</h2>

	<ul>
		{#each flakies as test (test.id)}
			{@const projectIds = new Set(test.testruns.map((tr) => tr.projectId))}
			<li>
				<span class="times">×{test.testruns.length}</span>
				<a href={linkToTest(params, test)}>
					{test.title}
				</a>
				<span class="projects">
					on
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
				</span>
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2>Branches</h2>

	<ul>
		{#each branches as branch (branch)}
			<li>
				<a
					href={resolve('/[owner]/[repo]/branches/[branch]', {
						...params,
						branch
					})}
				>
					{branch}
				</a>
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2>Tests</h2>

	<ul>
		{#each testsByFile as [filepath, tests] (filepath)}
			<li>
				<details>
					<summary>
						{filepath} ({tests.length} tests)
					</summary>
					<ul>
						{#each tests as test (test.id)}
							{@const ongoing = test.testruns.find(
								(tr) =>
									tr.run.status === 'in_progress' &&
									tr.duration === null &&
									tr.outcome !== 'skipped'
							)}
							<li>
								[{test.stepsCount}]

								{#if ongoing}
									<code title={formatDistanceToNow(ongoing.startedAt, { addSuffix: true })}>
										[ONGOING]
									</code>
								{/if}
								<a href={linkToTest(params, test)}>
									{[...test.path, test.title].join(' › ')}
								</a>
							</li>
						{/each}
					</ul>
				</details>
			</li>
		{/each}
	</ul>
</section>

<style>
	.flakies ul li {
		display: grid;
		grid-template-columns: max-content 1fr 1fr;
		gap: 0 0.75em;
	}
</style>
