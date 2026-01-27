import { steps, testruns, tests } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { findRepository, findTest, findTestRun, parsePayload, testId } from '../common';
import { db } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

export const _Body = type({
	githubJobId: 'number',
	test: createInsertSchema(tests).pick('title', 'path'),
	step: createInsertSchema(steps).omit('id', 'testrunId', 'duration', 'resultId', 'errorId')
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
