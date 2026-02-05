<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import TestTree from '$lib/components/TestTree.svelte';
	import { durationIsLonger, durationToMilliseconds, formatDurationShort } from '$lib/durations.js';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import { vscodeURL } from '$lib/filepaths.js';
	import { commitURL, userProfileURL, workflowJobURL, workflowRunURL } from '$lib/github.js';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import { aggregateRunResults, aggregateTestrunOutcomes, testrunIsOngoing } from '$lib/status.js';
	import { clamp, commonPrefixAndSuffixTrimmer, smartStringCompare } from '$lib/utils.js';
	import {
		compareDesc as compareDatesDesc,
		compareAsc as compareDatesAsc,
		formatDistanceToNowStrict,
		formatDuration,
		intervalToDuration
	} from 'date-fns';
	import { SvelteSet } from 'svelte/reactivity';
	import { linkToTest } from '../../[...test]/links.js';
	import { projectsOfRepo, repository, testsWithLatestTestrun } from '../../data.remote.js';
	import { expectedTestrunDuration, runsOfBranch } from './data.remote.js';
	import { holdingKeys } from '../../../../+layout.svelte';
	import { tick } from 'svelte';
	import RelativeTime from '$lib/RelativeTime.svelte';

	const { params } = $props();
	const repo = $derived(await repository(params));
	const projects = $derived(await projectsOfRepo(repo.id));

	let refreshing = $state(false);

	const ongoing = $derived(
		await runsOfBranch({ ...params, repoId: repo.id, status: 'in_progress' })
	);
	const completed = $derived(
		await runsOfBranch({ ...params, repoId: repo.id, status: 'completed' })
	);

	const currently = $derived(await testsWithLatestTestrun({ ...params, repoId: repo.id }));

	const refreshRate = $derived(Number(page.url.searchParams.get('refresh') ?? 3) * 1000);

	let interval: number | NodeJS.Timeout | undefined = $state();
	$effect(() => {
		interval = setInterval(() => {
			refreshing = true;
			void runsOfBranch({ ...params, repoId: repo.id, status: 'in_progress' })
				.refresh()
				.then(async () => tick())
				.then(() => {
					requestAnimationFrame(() => {
						refreshing = false;
					});
				});
		}, refreshRate);

		return () => clearInterval(interval);
	});

	const opened = new SvelteSet<number>();

	let now = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => {
			now = new Date();
		}, 100);

		return () => clearInterval(timer);
	});
</script>

<header>
	<a href={resolve('/[owner]/[repo]', params)}>back</a>

	<h1>Runs on {params.branch}</h1>
</header>

<section>
	<h2>
		Ongoing
		<span class="ping" class:loaded={!refreshing} title="Refreshing every {refreshRate * 1e-3}s">
			&bull;
		</span>
	</h2>

	{@render list(ongoing, true)}
</section>

<section>
	<h2>Currently</h2>

	<TestTree tests={currently}>
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
				{#if holdingKeys.shift}
					{#each latestTestruns as { run, projectId, outcome, id }, i (id)}
						{@const project = projects.get(projectId)!}
						{#if i > 0}&nbsp;{/if}
						<span class="per-project-status">
							<StatusIcon inProgress={run.status === 'in_progress'} {outcome} />
							<span class="subdued">
								{'{'}<a
									class="sneaky"
									href={resolve('/[owner]/[repo]/projects/[project]', {
										...params,
										project: project.name
									})}
								>
									{project.abbreviation}
								</a>{'}'}
							</span>
						</span>
					{/each}
				{:else}
					<StatusIcon
						outcome={aggregateTestrunOutcomes(
							latestTestruns.some(({ run }) => run.status === 'in_progress'),
							latestTestruns
						)}
					/>
				{/if}
			</span>
			<a
				href={linkToTest(params, test, params.branch)}
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

<section>
	<h2>Finished</h2>

	{@render list(completed)}
</section>

{#snippet list(groupedRuns: typeof ongoing | typeof completed, openDetails = false)}
	<ul>
		{#each groupedRuns as [runId, runs] (runId)}
			{@const { commitSha, commitTitle, commitAuthorUsername, commitAuthorName } = runs[0]}
			{@const inProgress = runs.some((r) => r.status === 'in_progress')}
			{@const startedAt = new Date(Math.min(...runs.map((r) => r.startedAt.getTime())))}

			{@const jobNameTrimmer = commonPrefixAndSuffixTrimmer(
				runs.map((r) => r.githubJobName),
				'0'
			)}

			{@const runsByJobName = Map.groupBy(runs, (r) => r.githubJobName)
				.entries()
				.toArray()
				.map(
					([name, runs]) =>
						[name, runs.toSorted((a, b) => compareDatesAsc(a.startedAt, b.startedAt))] as const
				)
				.toSorted(([a], [b]) => smartStringCompare(jobNameTrimmer(a), jobNameTrimmer(b)))}

			{@const outcome = aggregateRunResults(
				runsByJobName.map(([, attempts]) => attempts.at(-1)!)
			)}

			{#if commitSha.startsWith('01a')}
				{@const fck = runsByJobName.flatMap(([, attempts]) =>
					attempts
						.at(-1)!
						.testruns.filter((tr) => tr.outcome !== 'flaky' && tr.outcome !== 'expected' && tr.outcome !== "skipped" && tr.expectedStatus !== "skipped")
						.map(
							(tr) =>
								`${attempts.at(-1)!.githubJobId} ${tr.outcome} ${tr.test.title}`
						)
				)}
				{@debug fck}
			{/if}

			<li
				style:--job-name-length={Math.max(
					...runs.map((r) => jobNameTrimmer(r.githubJobName).length)
				)}
			>
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
							// TODO
							// warning: outcome === 'flaky',
							failure: outcome === 'failed' || outcome === "timedout",
							subdued: outcome === 'interrupted'
						}}
					>
						<ExternalLink sneaky url={workflowRunURL(repo, { githubRunId: runId })}
							>#{runId}</ExternalLink
						>
						<RelativeTime suffix date={startedAt} />
						<ExternalLink sneaky url={commitURL(repo, { commitSha })}
							>{commitSha.slice(0, 7)}</ExternalLink
						>
						{commitTitle}
						<span>
							by
							{#if commitAuthorUsername}
								<ExternalLink sneaky url={userProfileURL(commitAuthorUsername)}>
									{commitAuthorName}
								</ExternalLink>
							{:else}
								{commitAuthorName}
							{/if}
						</span>
					</summary>

					<ul>
						{#each runsByJobName as [jobName, runs] (jobName)}
							{@const hasReruns = runs.length > 1}
							{#if hasReruns}
								<li class="testrun reruns-header">
									<span class="subdued">
										|{jobNameTrimmer(jobName)}]
									</span>
									<span class="subdued">
										{runs.length} runs, latest was <RelativeTime
											suffix
											date={runs.at(-1)!.startedAt}
										/>
									</span>
								</li>
							{/if}
							{#each runs as run, i (run.id)}
								{@const currentTestrun =
									run.status === 'in_progress'
										? run.testruns
												.filter(testrunIsOngoing)
												.toSorted((a, b) => compareDatesDesc(a.startedAt, b.startedAt))
												.at(0)
										: undefined}

								{@const dones = run.testruns.filter((tr) => !testrunIsOngoing(tr))}
								{@const okays = dones.filter((tr) => tr.outcome !== 'unexpected')}
								{@const interrupteds = dones.filter((tr) => tr.interrupted)}
								{@const failures = dones.filter((tr) => tr.outcome === 'unexpected')}
								{@const flakies = dones.filter((tr) => tr.outcome === 'flaky')}

								<li class="testrun" class:has-progress-bar={run.status === 'in_progress'}>
									<span class="job-name subdued" class:is-rerun={hasReruns}>
										{#if hasReruns}
											| <ExternalLink
												sneaky
												url={workflowJobURL(repo, run)}
												title={run.githubJobName}
											>
												{i}
											</ExternalLink>
										{:else}
											[<ExternalLink
												sneaky
												url={workflowJobURL(repo, run)}
												title={run.githubJobName}
											>
												{jobNameTrimmer(run.githubJobName)}
											</ExternalLink>]
										{/if}
									</span>
									{#if run.status === 'in_progress'}
										<span class="icon">·</span>
										<span class="failure">
											{#if failures.length > 0}{failures.length}✘{/if}
										</span>
										<span class="warning">
											{#if flakies.length > 0}{flakies.length}~{/if}
										</span>
										<span class="success">
											{#if okays.length > 0}{okays.length}✓{/if}
										</span>
										<span class="progress">
											{dones.length + 1}/{run.testrunsCount}
										</span>
										<progress max={run.testrunsCount} value={dones.length}></progress>
										{#if currentTestrun}
											{@const project = projects.get(currentTestrun.projectId)!}
											{@const duration = intervalToDuration({
												start: currentTestrun.startedAt,
												end: now
											})}

											{#await expectedTestrunDuration({ ...currentTestrun, branch: params.branch })}
												<span class="subdued">
													{formatDurationShort(duration)}
												</span>
											{:then expectedDuration}
												{#if durationIsLonger(duration, expectedDuration, { seconds: 2 })}
													<span
														class="failure"
														title="Test is running overtime. It takes on average {formatDuration(
															expectedDuration
														)} on {project.name}"
													>
														{formatDurationShort(duration)}!
													</span>
												{:else}
													{@const currently = durationToMilliseconds(duration)}
													{@const expected = durationToMilliseconds(expectedDuration)}
													<span
														class="subdued"
														title="On {project.name}, it usually runs in {formatDuration(
															expectedDuration
														)}"
													>
														{(clamp(currently / expected) * 100).toFixed(0).padStart(2, ' ')}%
													</span>
												{/if}
											{:catch}
												<span class="subdued">{formatDurationShort(duration)}</span>
											{/await}
											<span class="subdued">
												{'{'}<a
													class="sneaky"
													title={project.name}
													href={resolve('/[owner]/[repo]/projects/[project]', {
														...params,
														project: project.name
													})}
												>
													{project.abbreviation}
												</a>{'}'}
											</span>
											<span class="rest">
												<a
													class="sneaky"
													href={linkToTest(params, currentTestrun.test, params.branch)}
												>
													{currentTestrun.test.title}
												</a>
											</span>
										{:else}
											<span class="step-progress"></span>
											<span class="subdued">waiting...</span>
										{/if}
									{:else if run.result === 'interrupted'}
										<StatusIcon outcome={null} />
										<span class="subdued">interrupted</span>
									{:else if run.result === 'passed'}
										{#if flakies.length === 0}
											<StatusIcon outcome="expected" />
											<span class="count">{okays.length}</span>
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
										{#if failures.length > 0}
											<span class="count"
												><span class="failure">{failures.length}</span>/{dones.length}
											</span>
											<span class="thing failure"> failed: </span>
											<span class="failures">
												<span class="failure">
													{#each failures.slice(0, 4) as failure, i (failure.id)}
														{#if i > 0},
														{/if}
														<a
															class="sneaky"
															href={linkToTest(params, failure.test, params.branch)}
														>
															{failure.test.title}
														</a>
													{/each}
												</span>
											</span>
										{:else if interrupteds.length > 0}
											<span class="count"
												><span class="failure">{interrupteds.length}</span>/{dones.length}</span
											>
											<span class="thing failure"> interr:</span>
											<span class="failures">
												{#each interrupteds.slice(0, 4) as interrupted, i (interrupted.id)}
													{#if i > 0},
													{/if}
													<a
														class="sneaky failure"
														href={linkToTest(params, interrupted.test, params.branch)}
													>
														{interrupted.test.title}
													</a>
												{/each}
											</span>
										{:else}
											<span class="failure count">{interrupteds.length}/{dones.length}</span>
											<span class="failure thing"> passed,</span>
											<span class="failure failures">but something went wrong</span>
										{/if}
									{/if}
								</li>
							{/each}
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

	summary {
		display: grid;
		grid-template-columns: max-content 16ch 7ch 800px 1fr;
		gap: 0 0.75em;
		align-items: center;
		width: 100%;
	}

	ul li {
		display: grid;
		grid-template-columns: minmax(max-content, 4ch) max-content 5ch 7ch 1fr;
		gap: 0 0.75em;
		overflow-x: hidden;
		align-items: center;
		width: 100%;

		&.has-progress-bar {
			grid-template-columns:
				minmax(max-content, 4ch) max-content repeat(3, 3ch)
				5ch 100px 4ch 4ch 1fr 1fr;
		}

		&:not(.has-progress-bar) + .has-progress-bar {
			margin-top: 0.5em;
		}

		&.has-progress-bar + :not(.has-progress-bar) {
			margin-top: 0.5em;
		}

		.count {
			text-align: right;
		}

		.job-name {
			width: calc(var(--job-name-length) * 1ch + 2ch);
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

	@keyframes fadeout {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	.ping.loaded {
		animation: fadeout 600ms ease-out forwards;
	}
</style>
