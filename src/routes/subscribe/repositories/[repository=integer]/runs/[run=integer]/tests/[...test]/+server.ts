/**
 * Subscribe to Steps of a given Testrun.
 */

import { parseTestPathParam } from '$lib/params.js';
import { db } from '$lib/server/db/index.js';
import { subscribe } from '$lib/server/realtime.js';
import * as tables from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
	const runIds = await db.query.runs.findMany({
		where: eq(tables.runs.githubRunId, Number(params.run)),
		columns: { githubJobId: true }
	});

	const filters = {
		repositoryId: Number(params.repository),
		githubRunId: runIds.map((run) => run.githubJobId),
		test: [parseTestPathParam(params.test)]
	};

	return new Response(
		subscribe({
			'test-begin': filters,
			'step-begin': filters,
			'test-end': filters
		}),
		{
			headers: {
				'Content-Type': 'text/event-stream'
			}
		}
	);
}
