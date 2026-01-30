<script lang="ts">
	import { commitURL, workflowJobURL, workflowRunURL } from '$lib/github.js';
	import { formatDistance, formatDistanceToNow, formatDuration } from 'date-fns';
	import { repository } from '../../data.remote';
	import { runsOfBranch } from './data.remote';

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
					<a href={workflowRunURL(repo, { githubRunId: runId })}>#{runId}</a>
					<a href={commitURL(repo, { commitSha })}>{commitSha.slice(0, 7)}</a>
					{formatDistanceToNow(startedAt, { addSuffix: true })}
				</summary>

                <ul>
                    {#each runs as run (run.id)}
                        <li>
                            <a href="{workflowJobURL(repo, run)}">#{run.githubJobId}</a>
                        </li>
                    {/each}
                </ul>
			</details>
		</li>
	{/each}
</ul>
{/snippet}
