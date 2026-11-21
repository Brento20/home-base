// One-off, after `npm run db:link`: records every migration in supabase/migrations as already
// applied to the live database (they were pasted into the SQL editor before the CLI tracked
// them), so `npm run db:push` only ever runs new ones. Safe to run again: it only writes history.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const versions = readdirSync('supabase/migrations')
	.filter((name) => /^\d{14}_.+\.sql$/.test(name))
	.map((name) => name.slice(0, 14))
	.sort();

console.log(`Marking ${versions.length} migrations as applied on the linked project…`);
const result = spawnSync(
	'npx',
	['supabase', 'migration', 'repair', '--status', 'applied', '--remote', ...versions],
	{ stdio: 'inherit' }
);
process.exit(result.status ?? 1);
