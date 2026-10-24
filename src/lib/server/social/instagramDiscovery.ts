import { COLE_INSTAGRAM_USERNAME } from '../../agencyBrand';
/** Owner-verified Cole discovery hints. These never grant binding or publishing authority. */
export const COLE_INSTAGRAM_EXPECTATION = { pageId: '1266254166581850', username: COLE_INSTAGRAM_USERNAME } as const;
export type InstagramDiscoveryReason = 'zero_pages' | 'expected_page_absent' | 'missing_page_token' | 'missing_linked_instagram_account' | 'instagram_identity_mismatch' | 'ambiguous_expected_page' | 'invalid_page_response' | 'ready';
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const hasPageToken = (page: Record<string, unknown>) => typeof page.access_token === 'string' && page.access_token.trim().length > 0;
const linked = (page: Record<string, unknown>) => record(page.instagram_business_account);
const hasInstagram = (page: Record<string, unknown>) => typeof linked(page).id === 'string' && /^\d+$/.test(linked(page).id as string);
/** Explicit projection only: never spread provider data into diagnostics. */
export function instagramDiscoveryDiagnostics(data: unknown, expected: {pageId: string; username: string} = COLE_INSTAGRAM_EXPECTATION) {
 const pages = Array.isArray(data) ? data.map(record) : [];
 const matches = pages.filter(page => page.id === expected.pageId);
 const page = matches.length === 1 ? matches[0] : {};
 const tokenPresent = hasPageToken(page), instagramPresent = hasInstagram(page);
 const usernameMatches = instagramPresent && linked(page).username === expected.username;
 const reason: InstagramDiscoveryReason = !Array.isArray(data) ? 'invalid_page_response' : !pages.length ? 'zero_pages' : !matches.length ? 'expected_page_absent' : matches.length > 1 ? 'ambiguous_expected_page' : !tokenPresent ? 'missing_page_token' : !instagramPresent ? 'missing_linked_instagram_account' : !usernameMatches ? 'instagram_identity_mismatch' : 'ready';
 return { reason, pagesReturned: pages.length, pagesWithToken: pages.filter(hasPageToken).length, pagesWithLinkedInstagram: pages.filter(hasInstagram).length, eligibleInstagramPages: pages.filter(p => typeof p.id === 'string' && /^\d+$/.test(p.id) && hasPageToken(p) && hasInstagram(p)).length, expectedPageMatches: matches.length, expectedPagePresent: matches.length > 0, expectedPageTokenPresent: tokenPresent, expectedPageLinkedInstagramPresent: instagramPresent, expectedInstagramUsernameMatches: usernameMatches };
}
