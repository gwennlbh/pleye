<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import { commitURL, userProfileURL, workflowRunURL } from '$lib/github.js';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import { testrunIsOngoing } from '$lib/testruns.js';
	import {
		compareDesc as compareDatesDesc,
		compareAsc as compareDatesAsc,
		formatDistanceToNowStrict
	} from 'date-fns';
	import { SvelteSet } from 'svelte/reactivity';
	import { linkToTest } from '../../[...test]/links.js';
	import { repository } from '../../data.remote.js';
	import { runsOfBranch } from './data.remote.js';

	const { params } = $props();
	const repo = $derived(await repository(params));

	const ongoing = $derived(
		await runsOfBranch({ ...params, repoId: repo.id, status: 'in_progress' })
	);
	const completed = $derived(
		await runsOfBranch({ ...params, repoId: repo.id, status: 'completed' })
	);

	let interval: number | NodeJS.Timeout | undefined = $state();
	$effect(() => {
		interval = setInterval(
			() => {
				void runsOfBranch({ ...params, repoId: repo.id, status: 'in_progress' }).refresh();
			},
			Number(page.url.searchParams.get('refresh') ?? 10) * 1000
		);

		return () => clearInterval(interval);
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
			{@const { commitSha, commitTitle, commitAuthorUsername, commitAuthorName, result } = runs[0]}
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
					<summary
						class={{
							warning: runs.some((r) => r.testruns.some((tr) => tr.outcome === 'flaky')),
							failure: result === 'failed' || result === 'interrupted'
						}}
					>
						<ExternalLink sneaky url={workflowRunURL(repo, { githubRunId: runId })}
							>#{runId}</ExternalLink
						>
						{formatDistanceToNowStrict(startedAt, { addSuffix: true })}
						<ExternalLink sneaky url={commitURL(repo, { commitSha })}
							>{commitSha.slice(0, 7)}</ExternalLink
						>
						{commitTitle}
						by
						{#if commitAuthorUsername}
							<ExternalLink sneaky url={userProfileURL(commitAuthorUsername)}>
								{commitAuthorName}
							</ExternalLink>
						{:else}
							{commitAuthorName}
						{/if}
					</summary>

					<ul>
						{#each runs.toSorted( (a, b) => compareDatesAsc(a.startedAt, b.startedAt) ) as run (run.id)}
							{@const currentTestrun =
								run.status === 'in_progress'
									? run.testruns
											.filter(testrunIsOngoing)
											.toSorted((a, b) => compareDatesDesc(a.startedAt, b.startedAt))
											.at(0)
									: undefined}

							{@const dones = run.testruns.filter((tr) => !testrunIsOngoing(tr))}
							{@const successes = dones.filter((tr) => tr.outcome !== 'unexpected')}
							{@const failures = dones.filter((tr) => tr.outcome === 'unexpected')}
							{@const flakies = dones.filter((tr) => tr.outcome === 'flaky')}
							{@const expecteds = dones.filter((tr) => tr.outcome === 'expected')}

							<li class="testrun" class:has-progress-bar={run.status === 'in_progress'}>
								{#if run.status === 'in_progress'}
									<span class="icon">·</span>
									<span class="failure">
										{#if failures.length > 0}{failures.length}✘{/if}
									</span>
									<span class="warning">
										{#if flakies.length > 0}{flakies.length}~{/if}
									</span>
									<span class="success">
										{#if successes.length > 0}{successes.length}✓{/if}
									</span>
									<span class="progress">
										{dones.length + 1}/{run.testrunsCount}
									</span>
									<progress max={run.testrunsCount} value={dones.length}></progress>
									{#if currentTestrun}
										<!-- {@const max = currentTestrun.test.stepsCount}
										{@const value = (currentStep?.index ?? 0) + 1}

										<span class="step-progress subdued">
											{#if max > 0}
												{((value / max) * 100).toFixed(0).padStart(2, ' ')}%
											{:else}
												0%
											{/if}
										</span> -->
										<span class="rest">
											<a
												class="sneaky"
												href={linkToTest(params, currentTestrun.test, params.branch)}
											>
												{currentTestrun.test.title}
											</a>
											<!-- <span class="step subdued">
												{#if currentStep}
													{[...currentStep.path, currentStep.title].join(' › ')}
												{/if}
											</span> -->
										</span>
									{:else}
										<span class="step-progress"></span>
										<span class="subdued">waiting...</span>
									{/if}
								{:else if run.result === 'interrupted'}
									<span class="subdued">— interrupted</span>
								{:else if run.result === 'passed'}
									{#if flakies.length === 0}
										<StatusIcon outcome="expected" />
										<span class="count">{successes.length}</span>
										<span class="thing">passed</span>
									{:else}
										<StatusIcon outcome="flaky" />
										<span class="count">
											<span class="warning">{flakies.length}</span>/{dones.length}
										</span>
										<span class="thing"> flakes: </span>
										<span class="flakies">
											{#each flakies as flaky, i (flaky.id)}
												{#if i > 0},
												{/if}
												<a class="sneaky" href={linkToTest(params, flaky.test, params.branch)}>
													{flaky.test.title}
												</a>
											{/each}
										</span>
									{/if}
								{:else if run.result === 'failed'}
									<StatusIcon outcome="unexpected" />
									<span class="count"
										><span class="failure">{failures.length}</span>/{dones.length}
									</span>
									<span class="thing failure"> failed: </span>
									<span class="failures">
										<span class="failure">
											{#each failures.slice(0, 4) as failure, i (failure.id)}
												{#if i > 0},
												{/if}
												<a class="sneaky" href={linkToTest(params, failure.test, params.branch)}>
													{failure.test.title}
												</a>
											{/each}
										</span>
									</span>
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
		grid-template-columns: max-content 4ch 7ch 1fr;
		gap: 0 0.75em;
		overflow-x: hidden;
		align-items: center;
		width: 100%;

		&.has-progress-bar {
			grid-template-columns: max-content repeat(3, 3ch) 5ch 100px 3ch 1fr 1fr;
		}

		&:not(.has-progress-bar) + .has-progress-bar {
			margin-top: 0.5em;
		}

		.count {
			text-align: right;
		}
	}

	/*li:not(:hover):not(:focus) .step {
		display: none; 
	} */

	details:open {
		margin-bottom: 1.5em;

		> summary {
			margin-bottom: 0.75em;
		}
	}
</style>
