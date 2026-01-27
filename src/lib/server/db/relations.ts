import { relations } from 'drizzle-orm';
import {
	repositories,
	projects,
	tests,
	runs,
	testruns,
	results,
	steps,
	errors,
	apiKeys
} from './schema';

/**
 *
 * DATA HIERARCHY:
 *
 * Repository > (Test | Project | Run) > Testrun > Result > (Error | Step > Error)
 *
 * For example:
 *
 * Repository: cigaleapp/cigale >
 *
 * For seeing progress and/or result on a specific run (commit)
 *
 * Run: workflow run #12345 on commit abcdef
 * > core.spec.js:42 on Chromium on workflow run #12345
 *   > failed
 *     > Error: expect(received).toBe(expected) ...
 *     > Step: 'click button'
 *     > Step: 'expect button test'
 *       > Error: expect(received).toBe(expected) ...
 *     > passed (retry #1)
 *       > Step: 'click button'
 *       > Step: 'expect button test'
 *
 * For cross-run data aggregation: (surfacing often flaky tests, etc)
 *
 * Test: core.spec.js:42
 * > core.spec.js:42 on Chromium on workflow run #12345
 *  > ...
 *
 * For cross-run per-browser stats (not much use for now)
 *
 * Project: Chromium
 * > core.spec.js:42 on Chromium on workflow run #12345
 *   > ...
 */

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	repository: one(repositories, {
		fields: [apiKeys.repositoryId],
		references: [repositories.id]
	})
}));

export const repositoryRelations = relations(repositories, ({ many }) => ({
	projects: many(projects),
	tests: many(tests),
	runs: many(runs),
	apiKeys: many(apiKeys)
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
	repository: one(repositories, {
		fields: [projects.repositoryId],
		references: [repositories.id]
	}),
	tests: many(tests)
}));

export const testRelations = relations(tests, ({ one, many }) => ({
	repository: one(repositories, {
		fields: [tests.repositoryId],
		references: [repositories.id]
	}),
	testruns: many(testruns)
}));

export const runRelations = relations(runs, ({ one, many }) => ({
	repository: one(repositories, {
		fields: [runs.repositoryId],
		references: [repositories.id]
	}),
	testruns: many(testruns)
}));

export const testrunRelations = relations(testruns, ({ one, many }) => ({
	run: one(runs, {
		fields: [testruns.runId],
		references: [runs.id]
	}),
	test: one(tests, {
		fields: [testruns.testId],
		references: [tests.id]
	}),
	project: one(projects, {
		fields: [testruns.projectId],
		references: [projects.id]
	}),
	results: many(results)
}));

export const resultRelations = relations(results, ({ one, many }) => ({
	testrun: one(testruns, {
		fields: [results.testrunId],
		references: [testruns.id]
	}),
	steps: many(steps),
	errors: many(errors)
}));

export const stepRelations = relations(steps, ({ one, many }) => ({
	testrun: one(testruns, {
		fields: [steps.testrunId],
		references: [testruns.id]
	}),
	result: one(results, {
		fields: [steps.resultId],
		references: [results.id]
	}),
	parentStep: one(steps, {
		fields: [steps.parentStepId],
		references: [steps.id]
	}),
	errors: many(errors)
}));

export const errorRelations = relations(errors, ({ one }) => ({
	result: one(results, {
		fields: [errors.resultId],
		references: [results.id]
	}),
	cause: one(errors, {
		fields: [errors.causeId],
		references: [errors.id]
	})
}));
