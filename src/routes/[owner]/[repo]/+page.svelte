<script lang="ts">
	import { resolve } from '$app/paths';
	import { gradientedColor } from '$lib/color.js';
	import TestTree from '$lib/components/TestTree.svelte';
	import {
		durationToMilliseconds,
		formatDurationShort,
		parseDuration,
		roundDuration
	} from '$lib/durations.js';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import { vscodeURL } from '$lib/filepaths.js';
	import { pullRequestURL } from '$lib/github.js';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import { aggregateTestrunOutcomes } from '$lib/testruns.js';
	import { basename, commonPrefixTrimmer } from '$lib/utils.js';
	import { linkToTest } from './[...test]/links.js';
	import {
		branchesOfRepo,
		flakyTests,
		longTests,
		projectsOfRepo,
		repository,
		testsWithLatestTestrun
	} from './data.remote.js';

	const { params } = $props();

	const repo = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(repo.id));
	const longs = $derived(await longTests(repo.id));
	const flakies = $derived(await flakyTests(repo.id));
	const branches = $derived(await branchesOfRepo(repo.id));
	const tests = $derived(await testsWithLatestTestrun({ repoId: repo.id, branch: 'main' }));

	const lowerIsBetterColor = $derived((values: number[], value: number) =>
		gradientedColor(
			Math.min(...values),
			Math.max(...values),
			value,
			'success',
			'warning',
			'failure'
		)
	);

	const filepathTrimmer = $derived((filepath: string) =>
		commonPrefixTrimmer(tests.map((t) => t.filePath))(filepath).replace(
			/\.(test|spec)\.[mc]?(jsx?|tsx?)$/,
			''
		)
	);

	const longestTrimmedFilepathLength = $derived(
		Math.max(...tests.map((t) => filepathTrimmer(t.filePath).length))
	)
</script>

<main
style:--projects-count={projects.size}
style:--longest-trimmed-filepath-length={longestTrimmedFilepathLength}
 >
	
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
			{#each branches as { id, name, pullRequestNumber, pullRequestTitle } (id)}
				<li class="branch">
					{#if pullRequestNumber !== null}
						<span>
							<ExternalLink url={pullRequestURL(repo, { pullRequestNumber })}>
								#{pullRequestNumber}
							</ExternalLink>
						</span>
					{:else if name === 'main'}
						<span style:color="var(--accent)"> default </span>
					{:else}
						<span class="no-pr"></span>
					{/if}
					<a
						class="sneaky"
						href={resolve('/[owner]/[repo]/branches/[...branch]', {
							...params,
							branch: name
						})}
					>
						{name}
					</a>
					<span class="subdued">{pullRequestTitle}</span>
				</li>
			{/each}
		</ul>
	</section>
	
	<section class="flakies">
		<h2>Flakies</h2>
	
		<ul>
			{#each flakies as { test, runsAmount, projectIds } (test!.id)}
				<li>
					<span class="subdued">
						{#if projectIds.length === projects.size}
							*
						{:else}
							{#each projectIds as id, i (id)}
								{@const { name, abbreviation } = projects.get(id)!}
								{#if i > 0}+{/if}<a
									class="sneaky"
									href={resolve('/[owner]/[repo]/projects/[project]', {
										...params,
										project: name
									})}
								>
									{abbreviation}
								</a>
							{/each}
						{/if}
					</span>
					<span
						class="times"
						style:color={lowerIsBetterColor(
							flakies.map((f) => f.runsAmount),
							runsAmount
						)}
					>
						{runsAmount}
					</span>
					<span class="subdued">
						{filepathTrimmer(test!.filePath)}
					</span>
					<a class="sneaky" href={linkToTest(params, test!, 'main')}>
						{test!.title}
					</a>
				</li>
			{/each}
		</ul>
	</section>
	
	<section class="longs">
		<h2>We'll get GTA6 before these tests end</h2>
		<ul>
			{#each longs as { test, averageDuration, projectIds } (test!.id)}
				{@const duration = parseDuration(averageDuration!)}
				{@const ms = durationToMilliseconds(duration)}
				<li>
					<span
						style:color={lowerIsBetterColor(
							longs.map((l) => durationToMilliseconds(parseDuration(l.averageDuration!))),
							ms
						)}>{formatDurationShort(roundDuration(duration))}</span
					>
					<span class="subdued">
						{filepathTrimmer(test!.filePath)}
					</span>
					<a class="sneaky" href={linkToTest(params, test!, 'main')}>
						{test!.title}
					</a>
				</li>
			{/each}
		</ul>
	</section>
	
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
</main>

<style>
	main {
		--projects-size: calc(3ch * (var(--projects-count) - 1));
		--filepaths-size: calc(1ch * var(--longest-trimmed-filepath-length) + 1ch);
	}
	
	.flakies ul li {
		display: grid;
		grid-template-columns: var(--projects-size) 4ch var(--filepaths-size) 1fr;
		gap: 0 0.75em;
	}

	.longs ul li {
		display: grid;
		grid-template-columns: 4ch var(--filepaths-size) 1fr;
		gap: 0 0.75em;
	}

	.node-status {
		margin-left: 0.5em;
	}

	.branch {
		display: grid;
		grid-template-columns: 7ch 30ch 1fr;
		gap: 0 0.75em;

		& > :nth-child(1) {
			text-align: right;
		}

		a {
			white-space: nowrap;
			overflow-x: hidden;
			text-overflow: ellipsis;
		}
	}
</style>
