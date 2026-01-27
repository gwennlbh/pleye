import { errors, results, steps } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';

export const _Body = type({
	githubJobId: 'number',
	testId: 'string',
	duration: createInsertSchema(steps).get('duration'),
	'error?': createInsertSchema(errors).omit('id', 'resultId')
});
