import {
	bigint,
	check,
	index,
	integer,
	interval,
	json,
	pgTable,
	point,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

import type {
	FullResult as PlaywrightFullResult,
	TestCase as PlaywrightTestCase,
	TestResult as PlaywrightTestResult,
	TestStep as PlaywrightTestStep
} from '@playwright/test/reporter';
import { sql } from 'drizzle-orm';
import { stringArray } from './types';

export const apiKeys = pgTable(
	'api_keys',
	{
		id: serial('id').primaryKey(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		name: text('name').notNull(),
		key: text('key').notNull(),
		repositoryId: integer('repository_id').notNull()
	},
	(t) => [uniqueIndex('key').on(t.key)]
);

export const repositories = pgTable(
	'repositories',
	{
		id: serial('id').primaryKey(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		githubId: integer('github_id').notNull().unique(),
		githubOwner: text('github_owner').notNull(),
		githubRepo: text('github_repo').notNull()
	},
	(t) => [
		index('by_owner_and_repo').on(t.githubOwner, t.githubRepo),
		uniqueIndex('github_id').on(t.githubId)
	]
);

/** A Playwright Project */
export const projects = pgTable(
	'projects',
	{
		id: serial('id').primaryKey(),
		repositoryId: integer('repository_id')
			.notNull()
			.references(() => repositories.id, { onDelete: 'cascade' }),

		name: text('name').notNull(),
		match: json('match').$type<string[]>().notNull(),
		ignore: json('ignore').$type<string[]>().notNull(),
		timeoutMs: integer('timeout_ms').notNull()
	},
	(t) => [
		index('by_repository').on(t.repositoryId),
		uniqueIndex('repository_and_name').on(t.repositoryId, t.name)
	]
);

export const tests = pgTable(
	'tests',
	{
		id: serial('id').primaryKey(),
		repositoryId: integer('repository_id')
			.notNull()
			.references(() => repositories.id, { onDelete: 'cascade' }),

		path: stringArray('path').notNull(),
		title: text('title').notNull(),
		filePath: text('file_path').notNull(),
		annotations: json('annotations').$type<PlaywrightTestCase['annotations']>().notNull(),
		tags: json('tags').$type<string[]>().notNull(),
		/** Point with coords (line, column) */
		locationInFile: point('location_in_file').notNull(),
		/** Latest-known steps count, updated at end of every test run, used for progress reporting */
		stepsCount: integer('steps_count').notNull()
	},
	(t) => [
		index('by_repository').on(t.repositoryId),
		uniqueIndex('repo_and_full_path').on(t.repositoryId, t.filePath, t.path, t.title)
	]
);

export const runs = pgTable(
	'runs',
	{
		id: serial('id').primaryKey(),
		repositoryId: integer('repository_id')
			.notNull()
			.references(() => repositories.id, { onDelete: 'cascade' }),

		githubJobId: bigint('github_job_id', { mode: 'number' }).notNull(),
		commitSha: text('commit_sha').notNull(),
		branch: text('branch').notNull(),
		pullRequestNumber: integer('pull_request_number'),
		startedAt: timestamp('started_at').notNull(),
		completedAt: timestamp('completed_at'),
		/** Github workflow job status */
		status: text('status', {
			enum: ['waiting', 'queued', 'in_progress', 'completed']
		}).notNull(),
		/** Playwright full test run result */
		result: text('result', {
			enum: [
				'passed',
				'failed',
				'timedout',
				'interrupted'
			] as const satisfies PlaywrightFullResult['status'][]
		})
	},
	(t) => [
		index('by_repository').on(t.repositoryId),
		index('by_commit').on(t.repositoryId, t.commitSha),
		index('by_pr').on(t.repositoryId, t.pullRequestNumber),
		index('by_branch').on(t.repositoryId, t.branch),
		uniqueIndex('repo_and_job').on(t.repositoryId, t.githubJobId)
	]
);

export const testruns = pgTable(
	'testruns',
	{
		id: serial('id').primaryKey(),
		runId: integer('run_id')
			.notNull()
			.references(() => runs.id, { onDelete: 'cascade' }),
		testId: integer('test_id')
			.notNull()
			.references(() => tests.id, { onDelete: 'cascade' }),
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),

		/** Outcome of the test, null if test is still running */
		outcome: text('outcome', {
			enum: ['skipped', 'expected', 'unexpected', 'flaky'] as const satisfies Array<
				ReturnType<PlaywrightTestCase['outcome']>
			>
		}),
		expectedStatus: text('expected_status', {
			enum: [
				'passed',
				'failed',
				'timedOut',
				'interrupted',
				'skipped'
			] as const satisfies PlaywrightTestCase['expectedStatus'][]
		}),
		startedAt: timestamp('started_at').notNull(),
		duration: interval('duration', { fields: 'hour to second' }),
		retries: integer('retries').notNull(),
		retriesLimit: integer('retries_limit').notNull(),
		timeoutMs: integer('timeout_ms').notNull()
	},
	(t) => [
		index('by_run').on(t.runId),
		index('by_test').on(t.testId),
		uniqueIndex('run_and_test').on(t.runId, t.testId)
	]
);

export const results = pgTable(
	'results',
	{
		id: serial('id').primaryKey(),
		testrunId: integer('testrun_id')
			.notNull()
			.references(() => testruns.id, { onDelete: 'cascade' }),

		annotations: json('annotations').$type<PlaywrightTestResult['annotations']>().notNull(),
		// TODO: support attachments?
		duration: interval('duration', { fields: 'hour to second' }).notNull(),
		retry: integer('retry').notNull(),
		startedAt: timestamp('started_at').notNull(),
		status: text('status', {
			enum: [
				'passed',
				'failed',
				'timedOut',
				'skipped',
				'interrupted'
			] as const satisfies PlaywrightTestResult['status'][]
		}),
		stderr: text('stderr').notNull(),
		stdout: text('stdout').notNull()
	},
	(t) => [
		index('by_testrun').on(t.testrunId),
		uniqueIndex('testrun_and_retry').on(t.testrunId, t.retry)
	]
);

export const steps = pgTable(
	'steps',
	{
		id: serial('id').primaryKey(),
		testrunId: integer('testrun_id')
			.notNull()
			.references(() => testruns.id, { onDelete: 'cascade' }),

		title: text('title').notNull(),
		path: stringArray('path').notNull(),
		annotations: json('annotations').$type<PlaywrightTestStep['annotations']>().notNull(),
		// TODO: support attachments?
		category: text('category', {
			/** From Playwright JSDoc:
			 * - `expect` for expect calls
			 * - `fixture` for fixtures setup and teardown
			 * - `hook` for hooks initialization and teardown
			 * - `pw:api` for Playwright API calls.
			 * - `test.step` for test.step API calls.
			 * - `test.attach` for testInfo.attach API calls.
			 */
			enum: ['expect', 'fixture', 'hook', 'pw:api', 'test.step', 'test.attach', 'custom']
		}).notNull(),
		// Null while step is running
		duration: interval('duration', { fields: 'hour to second' }),
		filePath: text('file_path'),
		locationInFile: point('location_in_file'),
		// TODO: support ts ?
		// parentStepId: integer('parent_step_id'),
		startedAt: timestamp('started_at').notNull()
	},
	(t) => [
		index('by_testrun').on(t.testrunId),
		uniqueIndex('testrun_and_path').on(t.testrunId, t.filePath, t.path, t.title)
	]
);

export const errors = pgTable(
	'errors',
	{
		id: serial('id').primaryKey(),
		resultId: integer('result_id').references(() => results.id, { onDelete: 'cascade' }),
		stepId: integer('step_id').references(() => steps.id, { onDelete: 'cascade' }),

		filePath: text('file_path'),
		locationInFile: point('location_in_file'),
		message: text('message'),
		stack: text('stack'),
		snippet: text('snippet'),
		value: text('value')
	},
	(t) => [
		check('linked_to_something', sql`not (${t.resultId} is null and ${t.stepId} is null)`),
		index('by_result').on(t.resultId),
		index('by_step').on(t.stepId)
	]
);
