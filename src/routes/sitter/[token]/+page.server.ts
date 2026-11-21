import { sitterPage } from '#lib/features/sitter/sitter.server.js';
import type { PageServerLoad } from './$types';

/**
 * A house-sitter page. No account needed: the link is the key. It shows only what the home picked
 * (sitter.ts) and stops working at the end of its last day or when the home stops it.
 */
export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	// Never kept by a browser or a shared cache: it can hold the Wi-Fi password or an alarm code.
	setHeaders({ 'cache-control': 'private, no-store' });
	return { page: await sitterPage(locals, params.token) };
};
