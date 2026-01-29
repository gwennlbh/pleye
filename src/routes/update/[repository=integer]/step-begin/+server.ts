import { db } from '$lib/server/db';
import { steps, tests } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { findTestRun, parsePayload, TestIdentifier } from '../common';
import { push } from '$lib/server/realtime.js';

export const _Body = type({
	githubJobId: 'number',
	test: TestIdentifier,
	step: createInsertSchema(steps).omit('id', 'testrunId', 'duration')
});

export async function POST({ request, params }) {
	const data = await parsePayload(request, _Body);

	const testrun = await findTestRun(params, data.githubJobId, data.test);

	const [step] = await db
		.insert(steps)
		.values({
			...data.step,
			testrunId: testrun.id
		})
		.returning();

	push('step-begin', testrun.runId, data.githubJobId, {
		test: data.test,
		index: step.index,
		retry: step.retry
	});

	return json({ step });
}
