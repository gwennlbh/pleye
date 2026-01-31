<script
	lang="ts"
	generics="T extends Pick<typeof tables.tests.$inferSelect, 'filePath' | 'path' | 'title' | 'locationInFile' | 'id'>"
>
	import type * as tables from '$lib/server/db/schema.js';
	import { arrayRemovePrefix } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import TestTree from './TestTree.svelte';

	interface Props {
		tests: T[];
		parents?: string[];
		leaf: Snippet<[T]>;
		node: Snippet<[string, T[]]>;
		maxDepth?: number;
		open?: boolean;
	}

	const { tests, parents = [], leaf, node, open = false }: Props = $props();

	const isRoot = $derived(parents.length === 0);

	const byParent = $derived(
		Map.groupBy(
			tests.map((test) => {
				const fullPath = [test.filePath, ...test.path, test.title];
				const [parent, ...restPath] = arrayRemovePrefix(fullPath, parents);

				return { test, restPath, parent };
			}),
			({ parent }) => parent
		)
			.entries()
			.toArray()
			.toSorted(([_, a], [__, b]) => {
				const aTests = a.map((e) => e.test);
				const bTests = b.map((e) => e.test);

				const keyA = sortKey(aTests);
				const keyB = sortKey(bTests);

				if (typeof keyA === 'number' && typeof keyB === 'number') {
					return keyA - keyB;
				} else {
					return String(keyA).localeCompare(String(keyB));
				}
			})
	);

	function sortKey(tests: T[]) {
		const files = new Set(tests.map((t) => t.filePath));
		if (files.size > 1) return 0;
		if (isRoot) {
			return tests[0].filePath;
		}
		return Math.min(...tests.map((t) => t.locationInFile[0]));
	}
</script>

<ul class:root={isRoot}>
	{#each byParent as [parent, entries] (parent)}
		{#if entries.filter((e) => e.restPath.length > 0).length === 0}
			<!-- 
                Since we include the test title in the path, entries should be of length one here
                This is because we can't have multiple leaf nodes within the same path (as the path, including title, are completely unique)
            -->
			<li>
				{@render leaf(entries[0].test)}
			</li>
		{:else}
			<li>
				<details open={open || parents.length > 0}>
					<summary>
						{@render node(
							parent,
							entries.map((e) => e.test)
						)}
					</summary>
					<TestTree
						{leaf}
						{node}
						tests={entries.map((e) => e.test)}
						parents={[...parents, parent]}
					/>
				</details>
			</li>
		{/if}
	{/each}
</ul>

<style>
	ul:not(.root) {
		padding-left: 1em;
		border-left: 2px solid var(--subdued);
	}

	ul > li {
		margin: 0.25em 0;
	}

	ul.root > li:has(> details:open) {
		margin-bottom: 1em;
	}

	details:open > summary :global([data-hide-if-open]) {
		display: none;
	}
</style>
