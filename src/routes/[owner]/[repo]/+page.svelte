<script lang="ts">
	import { resolve } from '$app/paths';
	import TestTree from '$lib/components/TestTree.svelte';
	import { parseDuration, roundDuration } from '$lib/durations.js';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import { aggregateTestrunOutcomes } from '$lib/testruns.js';
	import { formatDuration } from 'date-fns';
	import { linkToTest } from './[...test]/links.js';
	import {
		branchesOfRepo,
		flakyTests,
		longTests,
		projectsOfRepo,
		repository,
		testsWithLatestTestrun
	} from './data.remote.js';
	import { vscodeURL } from '$lib/filepaths.js';

	const { params } = $props();

	const { id } = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(id));
	const longs = $derived(await longTests(id));
	const flakies = $derived(await flakyTests(id));
	const branches = $derived(await branchesOfRepo(id));
	const tests = $derived(await testsWithLatestTestrun({ repoId: id, branch: 'main' }));
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

	<TestTree {tests}>
		{#snippet node(parent, tests)}
			<span class="node-status" data-hide-if-open>
				<StatusIcon
					outcome={aggregateTestrunOutcomes(
						tests.some((t) => t.latestTestruns.some(({ run }) => run.status === 'in_progress')),
						tests.flatMap((t) => t.latestTestruns)
					)}
				/>
			</span>
			{parent}
		{/snippet}
		{#snippet leaf({ latestTestruns, ...test })}
			<span
				class="status"
				title={latestTestruns
					.map((tr) =>
						[projects.get(tr.projectId)?.name ?? 'Unknown project', tr.outcome || 'unknown'].join(
							': '
						)
					)
					.join(', ')}
			>
				<StatusIcon
					outcome={aggregateTestrunOutcomes(
						latestTestruns.some(({ run }) => run.status === 'in_progress'),
						latestTestruns
					)}
				/>
			</span>
			<a
				href={linkToTest(params, test, 'main')}
				oncontextmenu={(e) => {
					if (!vscodeURL(test)) return;
					e.preventDefault();
					e.currentTarget.href = vscodeURL(test);
					e.currentTarget.click();
				}}
			>
				{test.title}
			</a>
		{/snippet}
	</TestTree>
</section>

<style>
	:is(.flakies, .longs) ul li {
		display: grid;
		grid-template-columns: 15ch 1fr 1fr;
		gap: 0 0.75em;
	}

	.node-status {
		margin-left: 0.5em;
	}
</style>
