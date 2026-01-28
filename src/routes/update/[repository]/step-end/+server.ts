import { db } from '$lib/server/db/index.js';
import { errors, steps } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { and, eq } from 'drizzle-orm';
import { findTestRun, parsePayload, StepIdentifier } from '../common';

export const _Body = type({
	githubJobId: 'number',
	step: StepIdentifier,
	duration: createInsertSchema(steps).get('duration').extract('string'),
	'error?': createInsertSchema(errors).omit('id', 'resultId')
});

export async function POST({ request, params }) {
	const data = await parsePayload(request, _Body);

	const testrun = await findTestRun(params, data.githubJobId, data.step.test);

	const [step] = await db
		.update(steps)
		.set({
			duration: data.duration
		})
		.where(
			and(
				eq(steps.testrunId, testrun.id),
				eq(steps.filePath, data.step.filePath),
				eq(steps.path, data.step.path),
				eq(steps.title, data.step.title)
			)
		)
		.returning();

	if (data.error) {
		await db.insert(errors).values({
			...data.error,
			stepId: step.id
		});
	}

	return json({ step });
}
