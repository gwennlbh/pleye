<script lang="ts">
	import { resolve } from '$app/paths';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import { commitURL, userProfileURL, workflowJobURL, workflowRunURL } from '$lib/github.js';
	import MaybeDetails from '$lib/MaybeDetails.svelte';
	import { testrunIsOngoing } from '$lib/testruns.js';
	import { formatDistanceToNowStrict } from 'date-fns';
	import { repository } from '../../data.remote';
	import { progressOfTestrun, runsOfBranch } from './data.remote';

	const { params } = $props();
	const repo = $derived(await repository(params));
	let { ongoing, completed } = $derived(await runsOfBranch({ ...params, repoId: repo.id }));

	$effect(() => {
		setInterval(() => {
			void runsOfBranch({ ...params, repoId: repo.id }).refresh();
		}, 1000);
	});
</script>

<header>
	<a href={resolve('/[owner]/[repo]', params)}>back</a>
	<h1>Runs on {params.branch}</h1>
</header>

<h2>Ongoing</h2>

{@render list(ongoing, true)}

<h2>Finished</h2>

{@render list(completed)}

{#snippet list(groupedRuns: typeof ongoing | typeof completed, openDetails = false)}
	<ul>
		{#each groupedRuns as [runId, runs] (runId)}
			{@const { commitSha, commitTitle, commitAuthorUsername, commitAuthorName } = runs[0]}
			{@const startedAt = new Date(Math.min(...runs.map((r) => r.startedAt.getTime())))}
			<li>
				<details open={openDetails}>
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
		{:else}
			<li class="empty">Nyathing here</li>
		{/each}
	</ul>
{/snippet}
