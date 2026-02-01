import { repository } from '../data.remote';
import { runsOfTest, testInRepo } from './data.remote.js';

export async function load({ params, url }) {
	const branch = url.searchParams.get('branch');
	const repo = await repository(params);
	const test = await testInRepo({ ...params, repoId: repo.id });
	const testruns = await runsOfTest({
		testId: test.id,
		branches: branch ? [branch] : null,
	});

	return { repo, test, testruns };
}
