export function workflowRunURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ githubRunId }: { githubRunId: number | null }
): URL {
	return new URL(`https://github.com/${githubOwner}/${githubRepo}/actions/runs/${githubRunId}`);
}

export function workflowJobURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ githubRunId }: { githubRunId: number | null },
	{ githubJobId }: { githubJobId: number }
): URL {
	const url = workflowRunURL({ githubOwner, githubRepo }, { githubRunId });
	url.pathname += `/jobs/${githubJobId}`;
	return url;
}
