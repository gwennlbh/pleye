<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';
	import { projectsOfRepo, repository } from '../data.remote.js';
	import { testInRepo, runsOfTest } from './data.remote.js';
	import { resolve } from '$app/paths';
	import { workflowJobURL } from '$lib/github.js';
	import type { EventOfKind } from '$lib/server/realtime.js';
	import { browser } from '$app/environment';

	const { params } = $props();
	const repo = $derived(await repository(params));
	const test = $derived(await testInRepo({ repoId: repo.id, ...params }));
	const runs = $derived(await runsOfTest(test.id));
	const projects = $derived(await projectsOfRepo(repo.id));

	$effect(() => {
		if (!browser) return;

		const updates = new EventSource(
			resolve('/subscribe/repositories/[repository=integer]/runs/[run=integer]/tests/[...test]', {
				repository: repo.githubId.toString(),
				run: runs.at(0)?.ciRun.githubRunId.toString() ?? '',
				test: params.test
			})
		);

		updates.onmessage = (event) => {
			const data = event.data as EventOfKind<'step-begin' | 'test-begin' | 'test-end' | 'end'>;
			console.log('Got update!', event, data);
		};
	});
</script>

<h1>
	{[...test.path, test.title].join(' › ')}
</h1>

<h2>Runs</h2>

<ul>
	{#each runs as run (run.id)}
		{@const currentStep = run.completedSteps.find((step) => !step.duration)}
		{@const ongoing = !run.outcome || currentStep}
		{@const project = projects.get(run.projectId)!}
		<li>
			{#if ongoing}
				<code title={formatDistanceToNow(run.startedAt)}>
					[ONGOING, Step {run.completedSteps.length}/{test.stepsCount}{#if currentStep}
						:&nbsp;{currentStep.category}
						{currentStep.title}
					{/if}
					]
				</code>
			{/if}
			Run
			<a rel="external" target="_blank" href={workflowJobURL(repo, run.ciRun).toString()}
				>#{run.ciRun.githubJobId}</a
			>
			on
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
