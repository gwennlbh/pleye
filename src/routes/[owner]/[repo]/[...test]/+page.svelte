<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ExternalLink from '$lib/ExternalLink.svelte';
	import {
		branchURL,
		commitURL,
		pullRequestURL,
		userProfileURL,
		workflowJobURL
	} from '$lib/github.js';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import { formatDurationShort } from '$lib/durations.js';
	import { FancyAnsi } from 'fancy-ansi';
	import { projectsOfRepo } from '../data.remote.js';

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
		{#if page.url.searchParams.has('branch')}
			@ {page.url.searchParams.get('branch')}
			<a href={resolve('/[owner]/[repo]/[...test]', params)}>all</a>
		{/if}
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
			{#each testruns as { run, results, ...testrun } (testrun.id)}
				{@const project = projects.get(testrun.projectId)!}
				<li>
					<details open={run.commitSha === latestCommit}>
						<summary>
							<ExternalLink sneaky url={commitURL(repo, run)}
								>{run.commitSha.slice(0, 7)}</ExternalLink
							>
							<StatusIcon {...testrun} inProgress={run.status === 'in_progress'} />
							<span
								class="testrun-header"
								class:failure={testrun.outcome === 'unexpected'}
								class:warning={testrun.outcome === 'flaky'}
								class:subdued={testrun.outcome === 'skipped'}
							>
								<span class="run">
									Run
									<ExternalLink sneaky url={workflowJobURL(repo, run)}
										>#{run.githubJobId}</ExternalLink
									>
								</span>
								<span class="duration subdued">
									{#if testrun.duration}
										{formatDurationShort(testrun.duration)}
									{/if}
								</span>
								<span class="project">
									on
									<a
										class="sneaky"
										href={resolve('/[owner]/[repo]/projects/[project]', {
											...params,
											project: project.name
										})}
									>
										{project.name}
									</a>
								</span>
								<span class="title">{run.commitTitle}</span>
								<span class="author">
									by
									{#if run.commitAuthorUsername}
										<ExternalLink sneaky url={userProfileURL(run.commitAuthorUsername)}>
											{run.commitAuthorName}
										</ExternalLink>
									{:else}
										{run.commitAuthorName}
									{/if}
								</span>
							</span>
						</summary>

						{#if results.some((r) => r.errors.length > 0)}
							<ul class="results">
								{#each results.toSorted((a, b) => a.retry - b.retry) as { errors, traceViewerUrl, retry, id, status } (id)}
									<li class="result" class:no-errors={errors.length === 0}>
										<header>
											<StatusIcon {status} />
											<strong>
												{retry ? `Retry #${retry}` : 'Initial run'}
											</strong>
											{#if traceViewerUrl}
												<ExternalLink url={traceViewerUrl}>View trace</ExternalLink>
											{:else if errors.length > 0}
												<span class="subdued">No trace</span>
											{/if}
										</header>

										<ul class="errors">
											{#each errors as { id, message, stack, ...location } (id)}
												<li class="error">
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
									</li>
								{/each}
							</ul>
						{/if}
					</details>
				</li>
			{/each}
		</ul>
	</section>
{/each}

<style>
	section {
		--l-muted: color-mix(in srgb, currentColor 5%, transparent);
		--d-muted: color-mix(in srgb, currentColor 7%, transparent);
		--muted: light-dark(var(--l-muted), var(--d-muted));
	}

	.results {
		padding-left: 1.25em;
		border-left: 3px solid var(--muted);
	}

	.result {
		margin: 1em 0 2em;

		&.no-errors {
			margin: 1em 0;
		}
	}

	.errors {
		margin-top: 0.5em;
	}

	.error {
		padding: 1.5em;
		background: var(--muted);
		border-radius: 0.5em;
		font-size: 0.9em;
		max-width: 800px;
		overflow-x: auto;
		text-wrap: nowrap;
		margin-bottom: 0.5em;
	}

	summary {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 0.75em;
	}

	.testrun-header {
		display: inline-grid;
		grid-template-columns: max-content 4ch 12ch 40vw max-content;
		gap: 0 0.75em;
	}

	summary .title {
		white-space: nowrap;
		overflow-x: hidden;
		text-overflow: ellipsis;
	}
</style>
