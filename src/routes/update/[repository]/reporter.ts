import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestError,
	TestResult,
	TestStep
} from '@playwright/test/reporter';
import type { Inputs } from './inputs';

type RunData = Inputs['begin']['run'];

export default class Pleye implements Reporter {
	#apiKey: string;
	#serverOrigin: string;
	#repositoryGitHubId: number;
	#runData: RunData;

	constructor(params: {
		/** API Key to use */
		apiKey: string;
		/** Origin of the Pleye server, e.g. https://pleye.example.com */
		serverOrigin: string;
		/** Github ID of the current repository */
		repositoryGitHubId: number;
		/** ID of the current GitHub job we're on */
		githubJobId: number;
		/** Current commit SHA */
		commitSha: string;
		/** Current branch name */
		branch: string;
		/** Pull request number, if any */
		pullRequestNumber?: number | undefined | null;
	}) {
		const { apiKey, serverOrigin, repositoryGitHubId, ...runData } = params;
		this.#apiKey = apiKey;
		this.#serverOrigin = serverOrigin;
		this.#repositoryGitHubId = repositoryGitHubId;
		this.#runData = {
			startedAt: new Date(),
			...runData
		};
	}

	onBegin(config: FullConfig, suite: Suite): void {
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

	onEnd(result: FullResult): Promise<{ status?: FullResult['status'] } | undefined | void> | void {
		this.#sendPayload('end', {
			status: 'completed',
			completedAt: new Date(),
			result: result.status,
			githubJobId: this.#runData.githubJobId
		});
	}

	onError(error: TestError): void {
		// TODO
	}

	async onExit(): Promise<void> {}

	onStdErr(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void {
		// TODO
	}

	onStdOut(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void {
		// TODO
	}

	onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
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

	onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
		this.#sendPayload('step-end', {
			githubJobId: this.#runData.githubJobId,
			test: titlepathToTestParams(test.titlePath()),
			duration: toISOInterval(step.duration),
			startedAt: step.startTime,
			error: step.error ? toError(step.error) : undefined
		});
	}

	onTestBegin(test: TestCase, result: TestResult): void {
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

	onTestEnd(test: TestCase, result: TestResult): void {
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

	#sendPayload<Event extends keyof Inputs>(event: Event, payload: Inputs[Event]): void {
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

function toArray<T>(item: T | T[]): T[] {
	return Array.isArray(item) ? item : [item];
}

function toStepCategory(category: string): Inputs['step-begin']['step']['category'] {
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

function toISOInterval(durationMs: number): string {
	const totalSeconds = Math.floor(durationMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const milliseconds = durationMs % 1000;

	return `PT${hours}H${minutes}M${seconds}.${milliseconds.toString().padStart(3, '0')}S`;
}

function toError(error: TestError): NonNullable<Inputs['step-end']['error']> {
	const { location, message, stack } = climbToCauseError(error);
	return {
		filePath: location?.file ?? null,
		locationInFile: location ? [location.line, location.column] : null,
		message: message,
		stack: stack
	};
}

function bufferToText(writes: Array<string | Buffer>): string {
	return writes.map((chunk) => (Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk)).join('');
}

function climbToCauseError(error: TestError): TestError {
	if (error.cause) {
		return climbToCauseError(error.cause);
	}

	return error;
}

function titlepathToTestParams(titlePath: string[]): { title: string; path: string[] } {
	const [_root, _project, _file, ...fullpath] = titlePath;

	return {
		title: fullpath.at(-1) ?? '',
		path: fullpath.slice(0, -1)
	};
}
