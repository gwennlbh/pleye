import { steps } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';

export const _Body = type({
	githubJobId: 'number',
    testId: 'string',
	step: createInsertSchema(steps).omit(
		'id',
		'testrunId',
		'duration',
		'resultId',
		'errorId',
		'parentStepId'
	)
});
