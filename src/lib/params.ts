import type { TestIdentifierParams } from '../routes/update/[repository=integer]/common';

const FILENAME_REGEX = /^(.*?)\.(spec|test).(jsx?|tsx?)$/;

export function parseTestPathParam(testParam: string): TestIdentifierParams {
	// The logic to find what part of [...test] is the filepath vs path+title:
	// we consider segments from the start, and up until (including) the first segment that
	// matches FILENAME_REGEX to be part of the filepath. The remaining segments are path+title,
	// with the last segment being the title, and the rest being the path.
	let filepath = [] as string[];
	let pathAndTitle = [] as string[];
	let accumulatingFilepath = true;

	for (const segment of testParam.split('/')) {
		if (segment.match(FILENAME_REGEX)) {
			filepath.push(segment);
			accumulatingFilepath = false;
			continue;
		}

		if (accumulatingFilepath) {
			filepath.push(segment);
		} else {
			pathAndTitle.push(segment);
		}
	}

	const title = pathAndTitle.pop()!;
	const path = pathAndTitle;

	return { filePath: '/' + filepath.join('/'), path, title };
}
