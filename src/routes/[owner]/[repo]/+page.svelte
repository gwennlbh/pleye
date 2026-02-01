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
	import ExternalLink from '$lib/ExternalLink.svelte';
	import { pullRequestURL } from '$lib/github.js';

	const { params } = $props();

	const repo = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(repo.id));
	const longs = $derived(await longTests(repo.id));
	const flakies = $derived(await flakyTests(repo.id));
	const branches = $derived(await branchesOfRepo(repo.id));
	const tests = $derived(await testsWithLatestTestrun({ repoId: repo.id, branch: 'main' }));
</script>

<header>
	<h1>{params.owner}/{params.repo}</h1>
	<p>
		projects = {'{'}
		{#each projects as [id, project], i (id)}
			{#if i > 0},
			{/if}
			<a
				href={resolve('/[owner]/[repo]/projects/[project]', {
					...params,
					project: project.name
				})}
			>
				{project.name}
			</a>
		{/each}
		{'}'}
	</p>
</header>

<section>
	<h2>Branches</h2>
	<ul>
		{#each branches as { branch, pullRequestNumber, pullRequestTitle } (branch)}
			<li class="branch">
				{#if pullRequestNumber !== null}
					<ExternalLink sneaky url={pullRequestURL(repo, { pullRequestNumber })}>
						#{pullRequestNumber}
					</ExternalLink>
				{:else}
					<span class="no-pr"></span>
				{/if}
				<a
					href={resolve('/[owner]/[repo]/branches/[...branch]', {
						...params,
						branch
					})}
				>
					{branch}
				</a>
				<span class="pr-title">{pullRequestTitle}</span>
			</li>
		{/each}
	</ul>
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

	.branch {
		display: grid;
		grid-template-columns: 5ch 30ch 1fr;
		gap: 0 0.75em;

		a {
			white-space: nowrap;
			overflow-x: hidden;
			text-overflow: ellipsis;
		}
	}
</style>
