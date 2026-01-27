/**
 * @import { Inputs } from '../routes/update/[repository]/inputs';
 * @import * as PW from '@playwright/test/reporter';
 * @typedef {Inputs['begin']['run']} RunData
 */

/**
 * @implements {PW.Reporter}
 */
export default class Pleye {
	/** @type {string} */
	#apiKey;
	/** @type {string} */
	#serverOrigin;
	/** @type {number} */
	#repositoryGitHubId;
	/** @type {RunData} */
	#runData;

	/**
	 *
	 * @param {object} params
	 * @param {string} params.apiKey API Key to use
	 * @param {string} params.serverOrigin Origin of the Pleye server, e.g. https://pleye.example.com
	 * @param {number} params.repositoryGitHubId Github ID of the current repository
	 * @param {number} params.githubJobId ID of the current GitHub job we're on
	 * @param {string} params.commitSha Current commit SHA
	 * @param {string} params.branch Current branch name
	 * @param {number | undefined | null} [params.pullRequestNumber] Pull request number, if any
	 */
	constructor(params) {
		const { apiKey, serverOrigin, repositoryGitHubId, ...runData } = params;
		this.#apiKey = apiKey;
		this.#serverOrigin = serverOrigin;
		this.#repositoryGitHubId = repositoryGitHubId;
		this.#runData = {
			startedAt: new Date(),
			...runData
		};
	}

	/**
	 *
	 * @param {PW.FullConfig} config
	 * @param {PW.Suite} suite
	 */
	onBegin(config, suite) {
		this.#sendPayload('begin', {
			run: this.#runData,
			projects: config.projects.map((project) => ({
				name: project.name,
				match: toArray(project.testMatch).map(String),
				ignore: toArray(project.testIgnore).map(String),
				timeoutMs: project.timeout
			}))
		});
	}

	/**
	 * @param {PW.FullResult} result
	 */
	onEnd(result) {
		this.#sendPayload('end', {
			status: 'completed',
			completedAt: new Date(),
			result: result.status,
			githubJobId: this.#runData.githubJobId
		});
	}

	// TODO: onError, onExit

	/**
	 *
	 * @param {PW.TestCase} test
	 * @param {PW.TestResult} result
	 * @param {PW.TestStep} step
	 * @returns
	 */
	onStepBegin(test, result, step) {
		if (step.steps.length > 0) {
			// We only care about "true" steps
			return;
		}

		const { title, path } = titlepathToTestParams(test.titlePath());
		this.#sendPayload('step-begin', {
			githubJobId: this.#runData.githubJobId,
			test: { title, path },
			step: {
				title,
				path,
				startedAt: step.startTime,
				annotations: step.annotations,
				category: toStepCategory(step.category)
				// TODO: step.parent
				// parentStepId: step.parent
			}
		});
	}

	/**
	 *
	 * @param {PW.TestCase} test
	 * @param {PW.TestResult} result
	 * @param {PW.TestStep} step
	 */
	onStepEnd(test, result, step) {
		this.#sendPayload('step-end', {
			githubJobId: this.#runData.githubJobId,
			test: titlepathToTestParams(test.titlePath()),
			duration: toISOInterval(step.duration),
			startedAt: step.startTime,
			error: step.error ? toError(step.error) : undefined
		});
	}

	/**
	 *
	 * @param {PW.TestCase} test
	 * @param {PW.TestResult} result
	 */
	onTestBegin(test, result) {
		const { title, path } = titlepathToTestParams(test.titlePath());

		const project = test.parent?.project();
		if (!project) {
			return;
		}

		this.#sendPayload('test-begin', {
			githubJobId: this.#runData.githubJobId,
			projectName: project.name,
			test: {
				title,
				path,
				tags: test.tags,
				filePath: test.location.file,
				locationInFile: [test.location.line, test.location.column],
				annotations: test.annotations
			},
			testrun: {
				timeoutMs: test.timeout,
				expectedStatus: test.expectedStatus,
				retriesLimit: test.retries,
				retries: result.retry
			}
		});
	}

	/**
	 *
	 * @param {PW.TestCase} test
	 * @param {PW.TestResult} result
	 */
	onTestEnd(test, result) {
		this.#sendPayload('test-end', {
			githubJobId: this.#runData.githubJobId,
			test: titlepathToTestParams(test.titlePath()),
			outcome: test.outcome(),
			stepsCount: result.steps.length || undefined,
			result: {
				duration: toISOInterval(result.duration),
				annotations: result.annotations,
				errors: result.errors.map(toError),
				retry: result.retry,
				startedAt: result.startTime,
				status: result.status,
				stdout: bufferToText(result.stdout),
				stderr: bufferToText(result.stderr)
			}
		});
	}

	/**
	 *
	 * @template {keyof Inputs} Event
	 * @param {Event} event
	 * @param {Inputs[Event]} payload
	 */
	#sendPayload(event, payload) {
		void fetch(`${this.#serverOrigin}/update/${this.#repositoryGitHubId}/${event}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.#apiKey}`
			},
			body: JSON.stringify(payload)
		});
	}
}

/**
 * @template T
 * @param {T | T[]} item
 * @returns {T[]}
 */
function toArray(item) {
	return Array.isArray(item) ? item : [item];
}

/**
 *
 * @param {string} category
 * @returns {Inputs['step-begin']['step']['category']}
 */
function toStepCategory(category) {
	switch (category) {
		case 'expect':
			return 'expect';
		case 'fixture':
			return 'fixture';
		case 'hook':
			return 'hook';
		case 'pw:api':
			return 'pw:api';
		case 'test.step':
			return 'test.step';
		case 'test.attach':
			return 'test.attach';
		default:
			return 'custom';
	}
}

/**
 *
 * @param {number} durationMs
 * @returns {string}
 */
function toISOInterval(durationMs) {
	const totalSeconds = Math.floor(durationMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const milliseconds = durationMs % 1000;

	return `PT${hours}H${minutes}M${seconds}.${milliseconds.toString().padStart(3, '0')}S`;
}

/**
 *
 * @param {PW.TestError} error
 * @returns {NonNullable<Inputs['step-end']['error']>}
 */
function toError(error) {
	const { location, message, stack } = climbToCauseError(error);
	return {
		filePath: location?.file ?? null,
		locationInFile: location ? [location.line, location.column] : null,
		message: message,
		stack: stack
	};
}

/**
 *
 * @param {Array<string | Buffer>} writes
 * @returns {string}
 */
function bufferToText(writes) {
	return writes.map((chunk) => (Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk)).join('');
}

/**
 *
 * @param {PW.TestError} error
 * @returns {PW.TestError}
 */
function climbToCauseError(error) {
	if (error.cause) {
		return climbToCauseError(error.cause);
	}

	return error;
}

/**
 *
 * @param {string[]} titlePath
 * @returns {{ title: string; path: string[] }}
 */
function titlepathToTestParams(titlePath) {
	const [_root, _project, _file, ...fullpath] = titlePath;

	return {
		title: fullpath.at(-1) ?? '',
		path: fullpath.slice(0, -1)
	};
}
