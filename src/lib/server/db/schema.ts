import {
	integer,
	interval,
	json,
	pgTable,
	point,
	serial,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

import type {
	TestCase as PlaywrightTestCase,
	TestResult as PlaywrightTestResult,
	TestStep as PlaywrightTestStep,
	FullResult as PlaywrightFullResult
} from '@playwright/test/reporter';

export const apiKeys = pgTable('api_keys', {
	id: serial('id').primaryKey(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	name: text('name').notNull(),
	key: text('key').notNull().unique(),
	repositoryId: integer('repository_id').notNull()
});

export const repositories = pgTable('repositories', {
	id: serial('id').primaryKey(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	githubId: integer('github_id').notNull().unique(),
	githubOwner: text('github_owner').notNull(),
	githubRepo: text('github_repo').notNull()
});

/** A Playwright Project */
export const projects = pgTable('projects', {
	id: serial('id').primaryKey(),
	repositoryId: integer('repository_id').notNull(),
	// TODO: unique constraint on (repositoryId, name)
	name: text('name').notNull(),
	match: json('match').$type<string[]>().notNull(),
	ignore: json('ignore').$type<string[]>().notNull(),
	timeoutMs: integer('timeout_ms').notNull()
});

export const tests = pgTable('tests', {
	id: text('id').primaryKey(),
	repositoryId: integer('repository_id').notNull(),
	path: json('path').$type<string[]>().notNull(),
	title: text('title').notNull(),
	filePath: text('file_path').notNull(),
	annotations: json('annotations').$type<PlaywrightTestCase['annotations']>().notNull(),
	tags: json('tags').$type<string[]>().notNull(),
	/** Point with coords (line, column) */
	locationInFile: point('location_in_file').notNull(),
	/** Latest-known steps count, updated at end of every test run, used for progress reporting */
	stepsCount: integer('steps_count').notNull(),
});

export const runs = pgTable('runs', {
	id: serial('id').primaryKey(),
	repositoryId: integer('repository_id').notNull(),
	githubJobId: integer('github_job_id').notNull(),
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
});

export const testruns = pgTable('testruns', {
	id: serial('id').primaryKey(),
	runId: integer('run_id').notNull(),
	testId: text('test_id').notNull(),
	projectId: integer('project_id').notNull(),
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
	retries: integer('retries').notNull(),
	retriesLimit: integer('retries_limit').notNull(),
	timeoutMs: integer('timeout_ms').notNull()
});

export const results = pgTable('results', {
	id: serial('id').primaryKey(),
	testrunId: integer('testrun_id').notNull(),
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
});

export const steps = pgTable('steps', {
	id: serial('id').primaryKey(),
	testrunId: integer('testrun_id').notNull(),
	/** Null if step pertains to a ongoing test run (not finished yet. useful to show progress) */
	resultId: integer('result_id'),
	errorId: integer('error_id'),
	title: text('title').notNull(),
	/** Parent step titles (idk what this is supposed to be, but it's gonna be TestStep#titlePath without the first element) */
	path: json('path').$type<string[]>().notNull(),
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
	duration: interval('duration', { fields: 'hour to second' }),
	filePath: text('file_path'),
	locationInFile: point('location_in_file'),
	// TODO: support ts ?
	// parentStepId: integer('parent_step_id'),
	startedAt: timestamp('started_at').notNull()
});

export const errors = pgTable('errors', {
	id: serial('id').primaryKey(),
	resultId: integer('result_id'),
	stepId: integer('step_id'),
	filePath: text('file_path'),
	locationInFile: point('location_in_file'),
	message: text('message'),
	stack: text('stack'),
	snippet: text('snippet'),
	value: text('value')
});
