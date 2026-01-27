import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult, TestStep}from '@playwright/test/reporter'

class Pleye implements Reporter {
    onBegin(config: FullConfig, suite: Suite): void {

    }

    onEnd(result: FullResult): Promise<{ status?: FullResult['status']; } | undefined | void> | void {

    }

    onError(error: TestError): void {

    }

    onExit(): Promise<void> {

    }

    onStdErr(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void {

    }

    onStdOut(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void {

    }

    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {

    }

    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {

    }

    onTestBegin(test: TestCase, result: TestResult): void {

    }

    onTestEnd(test: TestCase, result: TestResult): void {

    }
}
