/**
 * Subscribe to the Testruns of a given repository's run
 */

import { subscribe } from '$lib/server/realtime.js';

export async function GET({ params }) {
	const repositoryId = Number(params.repository);
	const githubRunId = Number(params.run);

	return new Response(
		subscribe({
			begin: { repositoryId, githubRunId },
			'test-begin': { repositoryId, githubRunId },
			'test-end': { repositoryId, githubRunId },
			end: { repositoryId, githubRunId }
		})
	);
}
