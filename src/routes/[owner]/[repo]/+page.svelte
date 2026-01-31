<script lang="ts">
	import { resolve } from '$app/paths';
	import { parseDuration, roundDuration } from '$lib/durations.js';
	import { formatDistanceToNow, formatDuration } from 'date-fns';
	import { linkToTest } from './[...test]/links.js';
	import {
		branchesOfRepo,
		flakyTests,
		longTests,
		projectsOfRepo,
		repository,
		testsOfRepoByFilename
	} from './data.remote.js';

	const { params } = $props();

	const { id } = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(id));
	const testsByFile = $derived(await testsOfRepoByFilename(id));
	const longs = $derived(await longTests(id));
	const flakies = $derived(await flakyTests(id));
	const branches = $derived(await branchesOfRepo(id));
</script>

<h1>{params.owner}/{params.repo}</h1>

<section class="side-by-side">
	<div class="left">
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
	</div>
	<div class="right">
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
	</div>
</section>

<section class="flakies">
	<h2>Flakies</h2>

	<ul>
		{#each flakies as { test, runsAmount, projectIds } (test!.id)}
			<li>
				<span class="times">{runsAmount} times</span>
				<a href={linkToTest(params, test!, 'main')}>
					{test!.title}
				</a>
				{@render projectsList(projectIds)}
			</li>
		{/each}
	</ul>
</section>

<section class="longs">
	<h2>We'll get GTA6 before these tests end</h2>
	<ul>
		{#each longs as { test, averageDuration, projectIds } (test!.id)}
			<li>
				<span>{formatDuration(roundDuration(parseDuration(averageDuration!)))}</span>
				<a href={linkToTest(params, test!, 'main')}>
					{test!.title}
				</a>
				{@render projectsList(projectIds)}
			</li>
		{/each}
	</ul>
</section>

{#snippet projectsList(ids: number[])}
	<span class="projects">
		on
		{#each ids as id, i (id)}
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
{/snippet}

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
	:is(.flakies, .longs) ul li {
		display: grid;
		grid-template-columns: 15ch 1fr 1fr;
		gap: 0 0.75em;
	}
</style>
