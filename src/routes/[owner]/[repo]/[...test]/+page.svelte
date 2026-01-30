<script lang="ts">
	import { resolve } from '$app/paths';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import {
		branchURL,
		commitURL,
		pullRequestURL,
		userProfileURL,
		workflowJobURL
	} from '$lib/github.js';
	import type { MapValues } from '$lib/utils.js';
	import { formatDistanceToNow } from 'date-fns';
	import { FancyAnsi } from 'fancy-ansi';
	import { projectsOfRepo } from '../data.remote.js';
	import { browser } from '$app/environment';

	const { params, data } = $props();
	const { test, repo, testruns: runs } = $derived(data);
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

	let repositoryUserRoot = $state('');
	$effect(() => {
		if (!browser) return;
		repositoryUserRoot = localStorage.getItem('repositoryUserRoot') || '';
	});

	function vscodeURL({
		filePath,
		locationInFile
	}: {
		filePath: string;
		locationInFile: [number, number];
	}) {
		return `vscode://file/${repositoryUserRoot}/${filePath}:${locationInFile.join(':')}`;
	}
</script>

<svelte:window
	onkeypress={(e) => {
		if (e.key === 'e') {
			window.open(vscodeURL(test));
		}
	}}
/>

<header>
	<p>
		<a href={resolve('/[owner]/[repo]', params)}>back</a> ·
		<a title="click or E to open in VS Code" rel="external" href={vscodeURL(test)}>
			{test.filePath}:{test.locationInFile.join(':')}
		</a>
		<span>
			{['', ...test.path].join(' / ')}
		</span>
	</p>
	<h1>
		{test.title}
	</h1>
</header>

{#each runs as [grouping, testruns] (grouping)}
	{@const run = testruns[0].run}
	{@const latestCommit = testruns[0].run.commitSha}
	<section>
		<h2>
			Runs
			{#if run.pullRequestNumber}
				for
				<ExternalLink url={pullRequestURL(repo, run)}>#{run.pullRequestNumber}</ExternalLink>
				{run.pullRequestTitle}
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
							{run.commitTitle}
							by
							{#if run.commitAuthorUsername}
								<ExternalLink url={userProfileURL(run.commitAuthorUsername)}>
									{run.commitAuthorName}
								</ExternalLink>
							{:else}
								{run.commitAuthorName}
							{/if}
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
						<ul class="errors">
							{#each errors as { id, message, stack, ...location } (id)}
								<li>
									{#if location.filePath && location.locationInFile}
										<a rel="external" href={vscodeURL(location)}>
											{location.filePath}:{location.locationInFile.join(':')}
										</a>
									{/if}
									<p>
										{@html ansiToHtml(stack || message || '')}
									</p>
								</li>
							{/each}
						</ul>
					</details>
				</li>
			{/each}
		</ul>
	</section>
{/each}

<style>
	.errors:not(:empty) {
		margin: 1em 0 2em;
	}
</style>
