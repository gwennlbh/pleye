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
	const fullpath = `${repositoryUserRoot}/${filePath}:${locationInFile.join(':')}`;

	const ide = localStorage.getItem('ide') || 'vscode';

	switch (ide) {
		case 'zed':
			return `zed://file/${fullpath}`;
		case 'vscode':
			return `vscode://file/${fullpath}`;
		case 'webstorm':
			return `webstorm://open?${new URLSearchParams({
				file: `${repositoryUserRoot}/${filePath}`,
				line: locationInFile[0].toString(),
				column: locationInFile[1].toString()
			})}`;
		default:
			console.error(`Invalid IDE ${ide}. Supported IDEs are: "zed", "vscode" and "webstorm".`);
	}

	return `#invalid-ide-${ide}-supported-are-zed-vscode-webstorm`;
}
