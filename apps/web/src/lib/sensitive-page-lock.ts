export type SensitivePageLockReason = "idle" | "hidden";

const DEFAULT_IDLE_MS = 15 * 60_000;
const DEFAULT_HIDDEN_MS = 60_000;

export function subscribeToSensitivePageLock(onLock: (reason: SensitivePageLockReason) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hidden = document.hidden;
  let deadline: number | undefined;
  let disposed = false;

  const clearTimer = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  const checkExpiration = (): boolean => {
    if (disposed || deadline === undefined || Date.now() < deadline) return false;
    // Clear the expired interval before invoking application code or handling another event.
    deadline = undefined;
    clearTimer();
    onLock(hidden ? "hidden" : "idle");
    return true;
  };
  const scheduleTimer = () => {
    clearTimer();
    if (disposed || deadline === undefined) return;
    timer = window.setTimeout(() => {
      if (!checkExpiration()) scheduleTimer();
    }, Math.max(0, deadline - Date.now()));
  };
  const renewDeadline = () => {
    if (disposed) return;
    // Wall-clock time includes device sleep; timers are only a wakeup mechanism.
    deadline = Date.now() + (hidden ? DEFAULT_HIDDEN_MS : DEFAULT_IDLE_MS);
    scheduleTimer();
  };
  const synchronizeVisibility = () => {
    const expired = checkExpiration();
    if (hidden !== document.hidden) {
      hidden = document.hidden;
      renewDeadline();
    }
    return expired;
  };
  const handleActivity = () => {
    if (disposed) return;
    const expired = synchronizeVisibility();
    if (!expired && !hidden) renewDeadline();
  };
  const handleResume = () => {
    if (!disposed) synchronizeVisibility();
  };

  for (const eventName of ["keydown", "pointerdown", "touchstart"] as const) {
    window.addEventListener(eventName, handleActivity, { capture: true, passive: true });
  }
  for (const eventName of ["focus", "pageshow"] as const) {
    window.addEventListener(eventName, handleResume);
  }
  document.addEventListener("visibilitychange", handleResume);
  renewDeadline();

  return () => {
    disposed = true;
    deadline = undefined;
    clearTimer();
    for (const eventName of ["keydown", "pointerdown", "touchstart"] as const) {
      window.removeEventListener(eventName, handleActivity, { capture: true });
    }
    for (const eventName of ["focus", "pageshow"] as const) {
      window.removeEventListener(eventName, handleResume);
    }
    document.removeEventListener("visibilitychange", handleResume);
  };
}
