/**
 * Runs a press handler; swallows sync throws and async rejections from fire-and-forget onPress
 * (web often swallows unhandled promise rejections otherwise).
 */
export function safePressHandler(fn?: (() => void) | (() => Promise<void>)) {
  if (!fn) return undefined;
  return () => {
    try {
      const ret = fn();
      if (ret != null && typeof (ret as Promise<unknown>).then === 'function') {
        void (ret as Promise<unknown>).catch(() => {});
      }
    } catch {
      /* silent */
    }
  };
}
