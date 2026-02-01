import { repository } from '../data.remote';
import { runsOfTest, testInRepo } from './data.remote.js';

export async function load({ params, url }) {
	const branch = url.searchParams.get('branch');
	const repo = await repository(params);
	const test = await testInRepo({ ...params, repoId: repo.id });
	const testruns = await runsOfTest({
		testId: test.id,
		branches: branch ? [branch] : null,
		openPRs: branch
			? []
			: await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}/pulls?state=open`)
					.then((res) => res.json())
					.then((prs) => (!Array.isArray(prs) ? [] : prs))
					.then((prs) => prs?.map((pr: { number: number }) => pr.number))
					.catch(() => [])
	});

	return { repo, test, testruns };
}
