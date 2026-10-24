import { COLE_BRAND, COLE_INSTAGRAM_USERNAME } from '../../agencyBrand';
/** Owner-verified Cole discovery hints. These never grant binding or publishing authority. */
export const COLE_INSTAGRAM_EXPECTATION = { pageId: '1266254166581850', pageName: COLE_BRAND, username: COLE_INSTAGRAM_USERNAME } as const;
export type InstagramDiscoveryReason = 'zero_pages' | 'expected_page_absent' | 'missing_page_token' | 'missing_linked_instagram_account' | 'instagram_identity_mismatch' | 'ambiguous_expected_page' | 'invalid_page_response' | 'ready';
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const hasPageToken = (page: Record<string, unknown>) => typeof page.access_token === 'string' && page.access_token.trim().length > 0;
const linked = (page: Record<string, unknown>) => record(page.instagram_business_account);
const hasInstagram = (page: Record<string, unknown>) => typeof linked(page).id === 'string' && /^[1-9]\d*$/.test(linked(page).id as string);
/** Explicit projection only: never spread provider data into diagnostics. */
export function instagramDiscoveryDiagnostics(data: unknown, expected: {pageId: string; username: string} = COLE_INSTAGRAM_EXPECTATION) {
 const pages = Array.isArray(data) ? data.map(record) : [];
 const invalidData = !Array.isArray(data) || pages.some(page => typeof page.id !== 'string' || !/^[1-9]\d*$/.test(page.id));
 const matches = pages.filter(page => page.id === expected.pageId);
 const page = matches.length === 1 ? matches[0] : {};
 const tokenPresent = hasPageToken(page), instagramPresent = hasInstagram(page);
 const usernameMatches = instagramPresent && linked(page).username === expected.username;
 const reason: InstagramDiscoveryReason = invalidData ? 'invalid_page_response' : !pages.length ? 'zero_pages' : !matches.length ? 'expected_page_absent' : matches.length > 1 ? 'ambiguous_expected_page' : !tokenPresent ? 'missing_page_token' : !instagramPresent ? 'missing_linked_instagram_account' : !usernameMatches ? 'instagram_identity_mismatch' : 'ready';
 return { reason, pagesReturned: pages.length, pagesWithToken: pages.filter(hasPageToken).length, pagesWithLinkedInstagram: pages.filter(hasInstagram).length, eligibleInstagramPages: pages.filter(p => typeof p.id === 'string' && /^\d+$/.test(p.id) && hasPageToken(p) && hasInstagram(p)).length, expectedPageMatches: matches.length, expectedPagePresent: matches.length > 0, expectedPageTokenPresent: tokenPresent, expectedPageLinkedInstagramPresent: instagramPresent, expectedInstagramUsernameMatches: usernameMatches };
}


type ResolutionReason = InstagramDiscoveryReason | 'direct_page_unavailable' | 'page_identity_mismatch' | 'page_credentials_unavailable' | 'page_credentials_unusable';
type MetaRead = (path: string, token: string, params: Record<string,string>) => Promise<unknown>;
/** Only this fixed Page can be recovered. All reads use the already-claimed authorization. */
export async function resolveColeInstagram(data: unknown, userToken: string, read: MetaRead) {
 const initial = instagramDiscoveryDiagnostics(data);
 let fallbackUsed = false, page: Record<string,unknown> = {};
 let credentialsVerified = false;
 const report = (reason: ResolutionReason) => ({reason, fallbackUsed, expectedPagePresent: page.id === COLE_INSTAGRAM_EXPECTATION.pageId, expectedPageNameMatches: page.name === COLE_INSTAGRAM_EXPECTATION.pageName, pageTokenPresent: hasPageToken(page), linkedInstagramPresent: hasInstagram(page), expectedInstagramUsernameMatches: linked(page).username === COLE_INSTAGRAM_EXPECTATION.username, credentialsVerified});
 const fail = (reason: ResolutionReason) => ({ok: false as const, diagnostics: report(reason)});
 if(initial.reason === 'invalid_page_response' || initial.reason === 'ambiguous_expected_page') return fail(initial.reason);
 page = (data as unknown[]).map(record).find(p => p.id === COLE_INSTAGRAM_EXPECTATION.pageId) || {};
 if(!page.id) {
  fallbackUsed = true;
  try { const identity = record(await read(COLE_INSTAGRAM_EXPECTATION.pageId, userToken, {fields:'id,name,instagram_business_account{id,username}'})); page = {id:identity.id,name:identity.name,instagram_business_account:identity.instagram_business_account}; }
  catch { return fail('direct_page_unavailable'); }
 }
 if(page.id !== COLE_INSTAGRAM_EXPECTATION.pageId || page.name !== COLE_INSTAGRAM_EXPECTATION.pageName) return fail('page_identity_mismatch');
 if(!hasInstagram(page)) return fail('missing_linked_instagram_account');
 const instagram = linked(page);
 if(instagram.username !== COLE_INSTAGRAM_EXPECTATION.username) return fail('instagram_identity_mismatch');
 if(fallbackUsed) {
  let credential: Record<string,unknown>;
  try { credential = record(await read(COLE_INSTAGRAM_EXPECTATION.pageId, userToken, {fields:'id,access_token'})); }
  catch { return fail('page_credentials_unavailable'); }
  if(credential.id !== page.id) return fail('page_credentials_unusable');
  page = {...page, access_token:credential.access_token};
 }
 if(!hasPageToken(page)) return fail('missing_page_token');
 const pageToken = page.access_token as string;
 try {
  // Presence is not usability: verify Page ownership/link and IG identity with that credential.
  const verifiedPage = record(await read(COLE_INSTAGRAM_EXPECTATION.pageId, pageToken, {fields:'id,name,instagram_business_account{id,username}'}));
  const verifiedInstagram = linked(verifiedPage);
  if(verifiedPage.id !== page.id || verifiedPage.name !== page.name || verifiedInstagram.id !== instagram.id || verifiedInstagram.username !== instagram.username) return fail('page_credentials_unusable');
  const account = record(await read(instagram.id as string, pageToken, {fields:'id,username'}));
  if(account.id !== instagram.id || account.username !== instagram.username) return fail('page_credentials_unusable');
  credentialsVerified = true;
 } catch { return fail('page_credentials_unusable'); }
 return {ok: true as const, account:{instagramId:instagram.id as string, username:instagram.username as string, pageToken}, diagnostics:report('ready')};
}
