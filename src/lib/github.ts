export function workflowRunURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ githubRunId }: { githubRunId: number | null }
): URL {
	return new URL(`https://github.com/${githubOwner}/${githubRepo}/actions/runs/${githubRunId}`);
}

export function workflowJobURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ githubRunId, githubJobId }: { githubRunId: number | null; githubJobId: number }
): URL {
	const url = workflowRunURL({ githubOwner, githubRepo }, { githubRunId });
	url.pathname += `/job/${githubJobId}`;
	return url;
}

export function commitURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ commitSha }: { commitSha: string }
): URL {
	return new URL(`https://github.com/${githubOwner}/${githubRepo}/commit/${commitSha}`);
}

export function branchURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ branch }: { branch: string }
): URL {
	return new URL(`https://github.com/${githubOwner}/${githubRepo}/tree/${branch}`);
}

export function pullRequestURL(
	{ githubOwner, githubRepo }: { githubOwner: string; githubRepo: string },
	{ pullRequestNumber }: { pullRequestNumber: number | null }
): URL {
	return new URL(`https://github.com/${githubOwner}/${githubRepo}/pull/${pullRequestNumber}`);
}

export function userProfileURL(username: string): URL {
	return new URL(`https://github.com/${username}`);
}
