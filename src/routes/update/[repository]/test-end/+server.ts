import { errors, results, testruns, tests } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { findTestRun } from '../common';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

const Outcome = createInsertSchema(testruns).get('outcome').extract('string');

export const _Body = type({
	githubJobId: 'number',
	outcome: Outcome,
	test: createInsertSchema(tests).pick('title', 'path'),
	stepsCount: 'undefined | number > 0',
	result: createInsertSchema(results)
		.omit('id', 'testrunId')
		.and({
			errors: createInsertSchema(errors).omit('id', 'resultId', 'stepId').array()
		})
});

export async function POST({ params, request }) {
	const payload = await request.json();
	const data = _Body.assert(payload);

	let testrun = await findTestRun(params, data.githubJobId, data.test);

	const [test] = await db
		.update(tests)
		.set({
			stepsCount: data.stepsCount
		})
		.where(eq(tests.id, testrun.testId))
		.returning();

	const [result] = await db
		.insert(results)
		.values({
			testrunId: testrun.id,
			...data.result
		})
		.returning();

	for (const error of data.result.errors) {
		await db.insert(errors).values({
			resultId: result.id,
			...error
		});
	}

	[testrun] = await db
		.update(testruns)
		.set({
			outcome: data.outcome
		})
		.where(eq(testruns.id, testrun.id))
		.returning();

	return json({ testrun, test, result });
}
