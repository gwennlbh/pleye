<script lang="ts">
	import { resolve } from '$app/paths';
	import { FancyAnsi } from 'fancy-ansi';
	import { branchURL, commitURL, pullRequestURL, workflowJobURL } from '$lib/github.js';
	import { formatDistanceToNow } from 'date-fns';
	import { projectsOfRepo, repository } from '../data.remote.js';
	import { runsOfTest, testInRepo } from './data.remote.js';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import type { MapValues } from '$lib/utils.js';

	const { params } = $props();
	const repo = $derived(await repository(params));
	const test = $derived(await testInRepo({ repoId: repo.id, ...params }));
	const runs = $derived(await runsOfTest(test.id));
	const projects = $derived(await projectsOfRepo(repo.id));

	function ansiToHtml(input: string) {
		const converter = new FancyAnsi();
		let out = '';

		for (const line of input.split('\n')) {
			out += converter.toHtml(line) + '<br>';
		}

		return out;
	}

	type RichRun = MapValues<typeof runs>[number];

	function statusicon(outcome: RichRun['outcome']) {
		switch (outcome) {
			case 'expected':
				return '✅';
			case 'unexpected':
				return '❌';
			case 'flaky':
				return '⚠️';
			case 'skipped':
				return '⏭️';
			case null:
				return '⏳';
			default:
				return '❓';
		}
	}
</script>

<h1>
	{[...test.path, test.title].join(' › ')}
</h1>

{#each runs as [grouping, testruns] (grouping)}
	{@const run = testruns[0].run}
	{@const latestCommit = testruns[0].run.commitSha}
	<h2>
		Runs

		{#if run.pullRequestNumber}
			for
			<ExternalLink url={pullRequestURL(repo, run)}>#{run.pullRequestNumber}</ExternalLink>
		{:else}
			on
			<ExternalLink url={branchURL(repo, run)}>{run.branch}</ExternalLink>
		{/if}
	</h2>

	<ul>
		{#each testruns as { run, result, errors, steps, ...testrun } (testrun.id)}
			{@const project = projects.get(testrun.projectId)!}
			{@const ongoing =
				testrun.duration === null && testrun.outcome === null && run.status === 'in_progress'}
			{@const currentStep = ongoing ? steps.find((step) => !step.duration) : undefined}
			<li style:color={testrun.expectedStatus === 'skipped' ? 'gray' : 'inherit'}>
				<details open={run.commitSha === latestCommit}>
					<summary>
						<a rel="external" target="_blank" href={commitURL(repo, run).toString()}
							>{run.commitSha.slice(0, 7)}
						</a>

						<span title="expected {testrun.expectedStatus}, actual {result?.status}"
							>[{statusicon(testrun.outcome)}]</span
						>
						{#if ongoing}
							<code title={formatDistanceToNow(testrun.startedAt)}>
								[ONGOING, Step {steps.length}/{test.stepsCount}{#if currentStep}
									:&nbsp;{currentStep.category}
									{currentStep.title}
								{/if}
								]
							</code>
						{/if}
						Run
						<a rel="external" target="_blank" href={workflowJobURL(repo, run).toString()}
							>#{run.githubJobId}</a
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
					</summary>

					<ul>
						{#each steps.filter((s) => s.errors.length > 0) as step (step.id)}
							<li>
								<details open>
									<summary>In {step.title}</summary>

									<ul>
										{#each step.errors as { id, message, stack } (id)}
											<li>
												<p style:font-family="monospace">
													{@html ansiToHtml(stack || message || '')}
												</p>
											</li>
										{/each}
									</ul>
								</details>
							</li>
						{/each}
					</ul>

					<ul>
						{#each errors as { id, message, stack } (id)}
							<li>
								<p style:font-family="monospace">
									{@html ansiToHtml(stack || message || '')}
								</p>
							</li>
						{/each}
					</ul>
				</details>
			</li>
		{/each}
	</ul>
{/each}
