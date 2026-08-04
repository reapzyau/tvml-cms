import "@crm/env/load";

type AllowList = {
	domains: readonly string[];
	addresses: readonly string[];
};

const EMPTY: AllowList = { domains: [], addresses: [] };

let cachedSource: string | undefined;
let cached: AllowList = EMPTY;

function allowList(): AllowList {
	const source = process.env.ALLOWED_SIGN_IN ?? "";
	if (source === cachedSource) return cached;

	const domains: string[] = [];
	const addresses: string[] = [];

	for (const raw of source.split(",")) {
		const entry = raw.trim().toLowerCase().replace(/^@/, "");
		if (!entry) continue;
		(entry.includes("@") ? addresses : domains).push(entry);
	}

	cachedSource = source;
	cached = { domains, addresses };
	return cached;
}

export function workspaceDomains(): readonly string[] {
	return allowList().domains;
}

export function primaryWorkspaceDomain(): string | undefined {
	return allowList().domains[0];
}

/**
 * The `hd` value to send Google, or undefined to send none.
 *
 * `hd` is not a hint. Google refuses any account outside that hosted domain at
 * its own sign-in screen, before this application's allow-list is ever
 * consulted — so an address the allow-list admits is turned away by an error
 * nothing in this codebase explains.
 *
 * It is therefore only safe to send when the allow-list is exactly one domain
 * and nothing else. A second entry — another domain, or a single outside
 * address like a contractor's — states that someone beyond the first domain is
 * meant to get in, and `hd` would silently lock them out.
 */
export function hostedDomainRestriction(): string | undefined {
	const { domains, addresses } = allowList();
	if (domains.length !== 1 || addresses.length > 0) return undefined;
	return domains[0];
}

export function hasSignInAllowList(): boolean {
	const { domains, addresses } = allowList();
	return domains.length > 0 || addresses.length > 0;
}

export function isWorkspaceEmail(email: string | null | undefined): boolean {
	const value = email?.trim().toLowerCase();
	if (!value) return false;

	const parts = value.split("@");
	if (parts.length !== 2) return false;

	const [local, host] = parts;
	if (!local || !host) return false;

	const { domains, addresses } = allowList();

	if (addresses.includes(value)) return true;

	return domains.some(
		(domain) => host === domain || host.endsWith(`.${domain}`),
	);
}
