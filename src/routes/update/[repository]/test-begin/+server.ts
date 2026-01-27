import { testruns, tests } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';

export const _Body = type({
	githubJobId: 'number',
    projectName: 'string',
	test: createInsertSchema(tests).omit('id', 'repositoryId'),
	testrun: createInsertSchema(testruns).omit('id', 'testId', 'outcome', 'runId', 'retries', 'projectId'),
});
