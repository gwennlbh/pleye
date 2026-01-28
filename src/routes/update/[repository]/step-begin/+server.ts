import { db } from '$lib/server/db';
import { steps, tests } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { findTestRun, parsePayload, TestIdentifier } from '../common';

export const _Body = type({
	githubJobId: 'number',
	test: TestIdentifier,
	step: createInsertSchema(steps).omit('id', 'testrunId', 'duration')
});

export async function POST({ request, params }) {
	const data = await parsePayload(request, _Body);

	const testrun = await findTestRun(params, data.githubJobId, data.test);

	return await db
		.insert(steps)
		.values({
			...data.step,
			testrunId: testrun.id
		})
		.returning()
		.then(([step]) => json({ step }));
}
