import { browser } from '$app/environment';

export function vscodeURL({
	filePath,
	locationInFile
}: {
	filePath: string;
	locationInFile: [number, number];
}) {
	if (!browser) return '';
	const repositoryUserRoot = localStorage.getItem('repositoryUserRoot') || '';
	if (!repositoryUserRoot) return '';

	return `vscode://file/${repositoryUserRoot}/${filePath}:${locationInFile.join(':')}`;
}
