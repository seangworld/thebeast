import { BEAST_ADMIN_MESSAGE_UNREAD_EVENT } from './beastAdminMessaging';
import { startVisiblePolling } from './visiblePolling';
export const UNREAD_VISIBLE_INTERVAL_MS = 5 * 60_000;
type Listener = (count: number) => void;
type Entry = { listeners: Set<Listener>; count?: number; poller: ReturnType<typeof startVisiblePolling> };
// Per authenticated user and browser realm. Never share cached counts across users.
const subscriptions = new Map<string, Entry>();
export function subscribeAdminMessageUnread(userId: string, listener: Listener, load: (signal: AbortSignal) => Promise<number>) {
  const notify: Listener = count => listener(count);
  let subscribed = true;
  let entry = subscriptions.get(userId);
  if (!entry) {
    const listeners = new Set<Listener>([notify]);
    const created: Entry = { listeners, poller: undefined as unknown as Entry['poller'] };
    created.poller = startVisiblePolling({
      intervalMs: UNREAD_VISIBLE_INTERVAL_MS,
      events: [BEAST_ADMIN_MESSAGE_UNREAD_EVENT],
      load: async signal => {
        const count = await load(signal);
        if (signal.aborted || !Number.isSafeInteger(count) || count < 0) return;
        created.count = count;
        created.listeners.forEach(notify => notify(count));
      },
      // Keep the last confirmed badge on transient errors; a failed check is not zero.
    });
    entry = created; subscriptions.set(userId, entry);
  } else {
    entry.listeners.add(notify);
    if (entry.count !== undefined) notify(entry.count);
  }
  const current = entry;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    current.listeners.delete(notify);
    if (!current.listeners.size) { current.poller.stop(); if (subscriptions.get(userId) === current) subscriptions.delete(userId); }
  };
}
