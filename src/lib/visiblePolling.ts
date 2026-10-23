// One serialized request at a time, only while a mounted consumer is visible.
export type PollingHost = {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener' | 'setTimeout' | 'clearTimeout'>;
  now?: () => number;
};
export function startVisiblePolling(options: {
  load: (signal: AbortSignal) => Promise<void>;
  intervalMs: number | (() => number | null);
  events?: string[];
  onError?: (error: unknown) => void;
  host?: PollingHost;
}) {
  const host = options.host || { document, window };
  const now = host.now || Date.now;
  let disposed = false, dirty = false, lastCompleted = -Infinity;
  let timer: number | undefined, controller: AbortController | undefined;
  let flight: Promise<void> | undefined;
  const visible = () => host.document.visibilityState === 'visible';
  const clear = () => { if (timer !== undefined) host.window.clearTimeout(timer); timer = undefined; };
  function schedule() {
    clear();
    const delay = typeof options.intervalMs === 'function' ? options.intervalMs() : options.intervalMs;
    if (!disposed && visible() && delay !== null && delay > 0) timer = host.window.setTimeout(() => { void refresh(false); }, delay);
  }
  function refresh(invalidate = true): Promise<void> {
    if (disposed || !visible()) return Promise.resolve();
    if (flight) { if (invalidate) dirty = true; return flight; }
    // Focus and visibilitychange often arrive together. Actions bypass this gap.
    if (!invalidate && now() - lastCompleted < 1000) { schedule(); return Promise.resolve(); }
    clear();
    flight = (async () => {
      do {
        dirty = false;
        controller = new AbortController();
        try { await options.load(controller.signal); }
        catch (error) { if (!disposed && !controller.signal.aborted) options.onError?.(error); }
        if (!controller.signal.aborted) lastCompleted = now();
      } while (dirty && !disposed && visible());
    })().finally(() => { flight = undefined; controller = undefined; schedule(); });
    return flight;
  }
  const onFocus = () => { void refresh(false); };
  const onAction = () => { void refresh(true); };
  const onVisibility = () => {
    if (visible()) { if (flight) dirty = true; else void refresh(true); }
    else { clear(); controller?.abort(); }
  };
  host.document.addEventListener('visibilitychange', onVisibility);
  host.window.addEventListener('focus', onFocus);
  for (const event of options.events || []) host.window.addEventListener(event, onAction);
  // Defer the first request so a Strict Mode setup/cleanup probe cannot send it.
  queueMicrotask(() => { if (!disposed) void refresh(false); });
  return {
    refresh,
    stop() {
      disposed = true; dirty = false; clear(); controller?.abort();
      host.document.removeEventListener('visibilitychange', onVisibility);
      host.window.removeEventListener('focus', onFocus);
      for (const event of options.events || []) host.window.removeEventListener(event, onAction);
    },
  };
}
