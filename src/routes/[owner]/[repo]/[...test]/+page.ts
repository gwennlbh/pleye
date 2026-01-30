import { repository } from '../data.remote';
import { runsOfTest, testInRepo } from './data.remote.js';

export async function load({ params }) {
	const repo = await repository(params);
	const test = await testInRepo({ ...params, repoId: repo.id });
	const testruns = await runsOfTest(test.id);
	return { repo, test, testruns };
}
