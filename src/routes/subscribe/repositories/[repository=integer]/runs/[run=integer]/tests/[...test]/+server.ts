/**
 * Subscribe to Steps of a given Testrun.
 */

import { parseTestPathParam } from '$lib/params.js';
import { subscribe } from '$lib/server/realtime.js';

export async function GET({ params }) {
	const filters = {
		repositoryId: Number(params.repository),
		githubRunId: Number(params.run),
		test: parseTestPathParam(params.test)
	};

	return new Response(
		subscribe({
			'test-begin': filters,
			'step-begin': filters,
			'test-end': filters
		})
	);
}
