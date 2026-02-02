import { db } from '$lib/server/db/index.js';
import { errors } from '$lib/server/db/schema';
import { type } from 'arktype';
import { findRun } from '../common';
import { createInsertSchema } from 'drizzle-arktype';
import { json } from '@sveltejs/kit';

export const _Body = type({
	githubJobId: 'number.integer > 0',
	error: createInsertSchema(errors).omit('id', 'runId', 'resultId', 'stepId')
});

export async function POST({ request, params }) {
	const body = await request.json();
	const data = _Body.assert(body);

	const run = await findRun(params, data.githubJobId);

	const [error] = await db
		.insert(errors)
		.values({
			runId: run.id,
			...data.error
		})
		.returning();

	return json({ error });
}
