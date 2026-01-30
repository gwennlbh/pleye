<script lang="ts">
	import { commitURL, workflowJobURL, workflowRunURL } from '$lib/github.js';
	import { formatDistance, formatDistanceToNow, formatDuration } from 'date-fns';
	import { repository } from '../../data.remote';
	import { progressOfTestrun, runsOfBranch } from './data.remote';
	import { testrunIsOngoing } from '$lib/testruns.js';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import MaybeDetails from '$lib/MaybeDetails.svelte';

	const { params } = $props();
	const repo = $derived(await repository(params));
	const { ongoing, completed } = $derived(await runsOfBranch({ ...params, repoId: repo.id }));
</script>

<h1>Runs on {params.branch}</h1>

<h2>Ongoing</h2>

{@render list(ongoing, true)}

<h2>Finished</h2>

{@render list(completed)}

{#snippet list(groupedRuns: typeof ongoing | typeof completed, openDetails = false)}
	<ul>
		{#each groupedRuns as [runId, runs] (runId)}
			{@const commitSha = runs[0].commitSha}
			{@const startedAt = new Date(Math.min(...runs.map((r) => r.startedAt.getTime())))}
			<li>
				<details open={openDetails}>
					<summary>
						<ExternalLink url={workflowRunURL(repo, { githubRunId: runId })}>#{runId}</ExternalLink>
						<ExternalLink url={commitURL(repo, { commitSha })}>{commitSha.slice(0, 7)}</ExternalLink
						>
						{formatDistanceToNow(startedAt, { addSuffix: true })}
					</summary>

					<ul>
						{#each runs as run (run.id)}
							{@const currentTestrun = run.testruns.find(
								(tr) => run.status === 'in_progress' && testrunIsOngoing(tr)
							)}
							<li>
								<MaybeDetails detailsData={currentTestrun} open>
									<ExternalLink url={workflowJobURL(repo, run)}>#{run.githubJobId}</ExternalLink>
									{run.status}
									{#if currentTestrun}
										<progress
											max={run.testrunsCount}
											value={run.testruns.filter(testrunIsOngoing).length}
										></progress>
										{[...currentTestrun.test.path, currentTestrun.test.title].join(' › ')}
									{/if}

									{#snippet details(testrun)}
										{@const currentStep = testrun.steps.at(-1)}
										{#await progressOfTestrun(testrun.id) then [value, max]}
											<code>
												{#if max > 0}
													{((value / max) * 100).toFixed(0).padStart(2, '0')}%
												{:else}
													00%
												{/if}
											</code>
											<progress {value} {max}></progress>
										{/await}
										{#if currentStep}
											<code>
												{[currentStep.filePath, ...(currentStep.locationInFile ?? [])].join(':')}
											</code>
											{[...currentStep.path, currentStep.title].join(' › ')}
										{/if}
									{/snippet}
								</MaybeDetails>
							</li>
						{/each}
					</ul>
				</details>
			</li>
		{/each}
	</ul>
{/snippet}
