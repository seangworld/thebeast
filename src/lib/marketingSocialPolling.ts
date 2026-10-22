import type { SocialPost } from './marketingSocial';
export function socialRefreshInterval(data: { controls: { paused: boolean }; posts: Pick<SocialPost, 'status' | 'scheduled_at'>[] } | null, now = Date.now()): number | null {
  if (!data || data.controls.paused) return null;
  if (data.posts.some(post => post.status === 'publishing' || post.status === 'processing')) return 30_000;
  const scheduled = data.posts.filter(post => post.status === 'scheduled' && post.scheduled_at).map(post => Date.parse(post.scheduled_at!)).filter(Number.isFinite);
  if (!scheduled.length) return null;
  return Math.min(5 * 60_000, Math.max(30_000, Math.min(...scheduled) - now));
}
