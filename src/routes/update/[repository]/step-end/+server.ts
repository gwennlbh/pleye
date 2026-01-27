import { errors, steps } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { findTestRun, parsePayload } from '../common';
import { db } from '$lib/server/db/index.js';
import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

export const _Body = type({
	githubJobId: 'number',
	test: createInsertSchema(steps).pick('title', 'path'),
	startedAt: 'string.date.iso.parse',
	duration: createInsertSchema(steps).get('duration').extract('string'),
	'error?': createInsertSchema(errors).omit('id', 'resultId')
});

export async function POST({ request, params }) {
	const data = await parsePayload(request, _Body);

	const testrun = await findTestRun(params, data.githubJobId, data.test);

	const [step] = await db
		.update(steps)
		.set({
			duration: data.duration
		})
		.where(and(eq(steps.testrunId, testrun.id), eq(steps.startedAt, data.startedAt)))
		.returning();

	if (data.error) {
		await db.insert(errors).values({
			...data.error,
			stepId: step.id
		});
	}

	return json({ step });
}
