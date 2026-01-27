import { errors, results, testruns, tests } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';

const Outcome = createInsertSchema(testruns).get('outcome').extract('string');

export const _Body = type({
	githubJobId: 'number',
	outcome: Outcome,
	test: createInsertSchema(tests).pick('title', 'path'),
	result: createInsertSchema(results)
		.omit('id', 'testrunId')
		.and({
			errors: createInsertSchema(errors).omit('id', 'resultId', 'stepId').array()
		})
});
