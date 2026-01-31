// TODO make this configurable
const PROJECT_ABBREVIATIONS: Record<string, string> = {
	chromium: 'cr',
	firefox: 'ff',
	webkit: 'wk'
};

export function projectNameAbbreviation(name: string): string {
	return PROJECT_ABBREVIATIONS[name.toLowerCase()] ?? name.slice(0, 2);
}
