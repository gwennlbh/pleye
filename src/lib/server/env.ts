import arkenv from 'arkenv';

export const env = arkenv({
	DATABASE_URL: 'string.url',
	MASTER_KEY: 'string > 10'
});
