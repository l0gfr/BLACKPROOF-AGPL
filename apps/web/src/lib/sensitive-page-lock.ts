export type SensitivePageLockReason = "idle" | "hidden";

const DEFAULT_IDLE_MS = 15 * 60_000;
const DEFAULT_HIDDEN_MS = 60_000;

export function subscribeToSensitivePageLock(onLock: (reason: SensitivePageLockReason) => void): () => void {
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let hiddenTimer: ReturnType<typeof setTimeout> | undefined;

  const clearIdleTimer = () => {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = undefined;
  };
  const clearHiddenTimer = () => {
    if (hiddenTimer) window.clearTimeout(hiddenTimer);
    hiddenTimer = undefined;
  };
  const armIdleTimer = () => {
    clearIdleTimer();
    idleTimer = window.setTimeout(() => onLock("idle"), DEFAULT_IDLE_MS);
  };
  const handleActivity = () => {
    if (!document.hidden) armIdleTimer();
  };
  const handleVisibility = () => {
    clearHiddenTimer();
    if (document.hidden) {
      clearIdleTimer();
      hiddenTimer = window.setTimeout(() => {
        if (document.hidden) onLock("hidden");
      }, DEFAULT_HIDDEN_MS);
    } else {
      armIdleTimer();
    }
  };

  for (const eventName of ["keydown", "pointerdown", "touchstart"] as const) {
    window.addEventListener(eventName, handleActivity, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", handleVisibility);
  armIdleTimer();

  return () => {
    clearIdleTimer();
    clearHiddenTimer();
    for (const eventName of ["keydown", "pointerdown", "touchstart"] as const) {
      window.removeEventListener(eventName, handleActivity, { capture: true });
    }
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
