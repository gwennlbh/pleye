<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import { commitURL, userProfileURL, workflowJobURL, workflowRunURL } from '$lib/github.js';
	import { testrunIsOngoing } from '$lib/testruns.js';
	import { formatDistanceToNowStrict } from 'date-fns';
	import { repository } from '../../data.remote';
	import { runsOfBranch } from './data.remote';
	import { SvelteSet } from 'svelte/reactivity';
	import { linkToTest } from '../../[...test]/links.js';

	const { params } = $props();
	const repo = $derived(await repository(params));
	let { ongoing, completed } = $derived(await runsOfBranch({ ...params, repoId: repo.id }));

	let interval: number | NodeJS.Timeout | undefined = $state();
	$effect(() => {
		interval = setInterval(
			() => {
				void runsOfBranch({ ...params, repoId: repo.id }).refresh();
			},
			Number(page.url.searchParams.get('refresh') ?? 10) * 1000
		);
	});

	const opened = new SvelteSet<number>();
</script>

<header>
	<a href={resolve('/[owner]/[repo]', params)}>back</a>
	{#if interval}
		<button
			onclick={() => {
				clearInterval(interval);
				interval = undefined;
			}}
		>
			stop autoupdate
		</button>
	{:else}
		<button disabled>autoupdate stopped</button>
	{/if}
	<h1>Runs on {params.branch}</h1>
</header>

<section>
	<h2>Ongoing</h2>

	{@render list(ongoing, true)}
</section>

<section>
	<h2>Finished</h2>

	{@render list(completed)}
</section>

{#snippet list(groupedRuns: typeof ongoing | typeof completed, openDetails = false)}
	<ul>
		{#each groupedRuns as [runId, runs] (runId)}
			{@const { commitSha, commitTitle, commitAuthorUsername, commitAuthorName } = runs[0]}
			{@const startedAt = new Date(Math.min(...runs.map((r) => r.startedAt.getTime())))}
			<li>
				<details
					open={openDetails || opened.has(runId)}
					ontoggle={(e) => {
						e.preventDefault();
						if (openDetails) return;
						if (e.currentTarget.open) {
							opened.add(runId);
						} else {
							opened.delete(runId);
						}
					}}
				>
					<summary>
						<ExternalLink url={workflowRunURL(repo, { githubRunId: runId })}>#{runId}</ExternalLink>
						{formatDistanceToNowStrict(startedAt, { addSuffix: true })}
						<ExternalLink url={commitURL(repo, { commitSha })}>{commitSha.slice(0, 7)}</ExternalLink
						>
						{commitTitle}
						by
						{#if commitAuthorUsername}
							<ExternalLink url={userProfileURL(commitAuthorUsername)}>
								{commitAuthorName}
							</ExternalLink>
						{:else}
							{commitAuthorName}
						{/if}
					</summary>

					<ul>
						{#each runs as run (run.id)}
							{@const currentTestrun =
								run.status === 'in_progress' &&
								run.testruns
									.filter(testrunIsOngoing)
									.toSorted((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
									.at(0)}
							{@const dones = run.testruns.filter((tr) => !testrunIsOngoing(tr))}
							{@const successes = dones.filter((tr) => tr.outcome !== 'unexpected')}
							{@const failures = dones.filter((tr) => tr.outcome === 'unexpected')}
							{@const flakies = dones.filter((tr) => tr.outcome === 'flaky')}
							{@const expecteds = dones.filter((tr) => tr.outcome === 'expected')}
							<li class="testrun">
								<ExternalLink url={workflowJobURL(repo, run)}>
									{#if run.githubJobName}
										{run.githubJobName}
									{:else}
										#{run.githubJobId}
									{/if}
								</ExternalLink>
								{#if currentTestrun}
									{@const currentStep = currentTestrun.steps.at(-1)}
									<span class="progress">
										<span class="success">
											{successes.length}✓
										</span>
										<span class="warning">
											{flakies.length}~
										</span>
										<span class="failure">
											{failures.length}✘
										</span>
										{dones.length + 1}/{run.testrunsCount}
										<progress max={run.testrunsCount} value={dones.length}></progress>
									</span>
									<span class="rest">
										{currentTestrun.test.title}
										<span class="step">
											{#if currentStep}
												{@const max = currentTestrun.test.stepsCount}
												{@const value = currentStep.index + 1}
												<code>
													{#if max > 0}
														{((value / max) * 100).toFixed(0).padStart(2, ' ')}%
													{:else}
														0%
													{/if}
												</code>
												<progress {value} {max}></progress>
												{[...currentStep.path, currentStep.title].join(' › ')}
											{/if}
										</span>
									</span>
								{:else if run.result === 'interrupted'}
									<span>— interrupted</span>
								{:else if run.result === 'passed'}
									<span class="success">
										✔ {run.testruns.filter((tr) => tr.outcome !== 'unexpected').length} tests passed
									</span>
									{#if flakies.length > 0}
										<span class="warning">
											~ {flakies.length} flaky tests:
											{#each flakies as flaky, i (flaky.id)}
												{#if i > 0},
												{/if}
												<a href={linkToTest(params, flaky.test, params.branch)}>
													{flaky.test.title}
												</a>
											{/each}
										</span>
									{/if}
								{:else if run.result === 'failed'}
									<span class="failure"
										>✘ {run.testruns.filter((tr) => tr.outcome === 'unexpected').length} tests failed:
									</span>

									{#each failures as failure, i (failure.id)}
										{#if i > 0},
										{/if}
										<a href={linkToTest(params, failure.test, params.branch)}>
											{failure.test.title}
										</a>
									{/each}
								{/if}
							</li>
						{/each}
					</ul>
				</details>
			</li>
		{:else}
			<li class="empty">Nyathing here</li>
		{/each}
	</ul>
{/snippet}

<style>
	.testrun {
		overflow-x: hidden;
		text-wrap: nowrap;
	}

	ul li {
		display: grid;
		grid-template-columns: max-content max-content 1fr 1fr;
		gap: 0 0.75em;
	}

	li:not(:hover):not(:focus) .step {
		display: none;
	}

	details:open {
		margin-bottom: 1em;
	}
</style>
