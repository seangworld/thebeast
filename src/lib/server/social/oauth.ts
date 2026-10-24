/** Purpose is persisted in Meta's otherwise-unused verifier, never trusted from callback query parameters.
 * X retains its unmodified PKCE verifier. Legacy Meta states retain the separate Facebook flow.
 */
export const AGENCY_INSTAGRAM_PATH = '/dashboard/admin/agency/metrics';
export const INSTAGRAM_SCOPES = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'] as const;
export const FACEBOOK_SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish';
const marker = 'agency-instagram-v1:';
export function instagramVerifier(nonce: string) {
 if(!/^[\w-]{64}$/.test(nonce))throw Error('Invalid OAuth nonce.');
 return marker + nonce;
}
export function metaIntent(verifier: unknown): 'agency_instagram'|'social_meta' {
 if(typeof verifier!=='string')throw Error('Invalid OAuth state purpose.');
 if(verifier.startsWith(marker)&&/^[\w-]{64}$/.test(verifier.slice(marker.length)))return 'agency_instagram';
 if(/^[\w-]{64}$/.test(verifier))return 'social_meta';
 throw Error('Invalid OAuth state purpose.');
}
export function instagramPermissionsGranted(data: unknown) {
 if(!Array.isArray(data))return false;
 return INSTAGRAM_SCOPES.every(permission=>{const rows=data.filter(row=>row?.permission===permission);return rows.length===1&&rows[0]?.status==='granted';});
}
