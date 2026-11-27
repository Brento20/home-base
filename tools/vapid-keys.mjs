// Makes the key pair the Worker signs phone notifications with (VAPID, RFC 8292), and prints
// how to set it. Run it once: changing the pair later turns everyone's notifications off until
// they turn them on again.
//
//   npm run push:keys

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
	'sign',
	'verify'
]);
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const base64url = (bytes) =>
	Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const publicKey = base64url(publicRaw);
const privateKey = jwk.d;

console.log(`
Phone notification keys. Set both, then deploy:

  npx wrangler secret put VAPID_PUBLIC_KEY
    ${publicKey}

  npx wrangler secret put VAPID_PRIVATE_KEY
    ${privateKey}

For local development, add the same two lines to .dev.vars (never commit it):

  VAPID_PUBLIC_KEY=${publicKey}
  VAPID_PRIVATE_KEY=${privateKey}

Optionally set VAPID_SUBJECT to mailto:you@example.com, so push services can reach you.
Keep the private key secret. Make a new pair only if it leaks: everyone's phones would
need to turn notifications on again.
`);
