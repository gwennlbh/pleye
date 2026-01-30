import { resolve } from '$app/paths';
import type { tests } from '$lib/server/db/schema';

export function linkToTest(
	repoParams: { owner: string; repo: string },
	test: typeof tests.$inferSelect,
	branch: string | null = null
) {
	const path = resolve('/[owner]/[repo]/[...test]', {
		...repoParams,
		test: [test.filePath.replace(/^\//, ''), ...test.path, test.title].join('/')
	});

	if (branch) {
		return path + '?' + new URLSearchParams({ branch });
	}

	return path;
}
