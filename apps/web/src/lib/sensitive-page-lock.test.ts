import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToSensitivePageLock } from "./sensitive-page-lock";

const IDLE_MS = 15 * 60_000;
const HIDDEN_MS = 60_000;

describe("sensitive page expiration", () => {
  let page: EventTarget & { hidden: boolean };
  let browser: EventTarget;
  let unsubscribe: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    page = Object.assign(new EventTarget(), { hidden: false });
    browser = new EventTarget();
    vi.stubGlobal("document", page);
    vi.stubGlobal("window", Object.assign(browser, { setTimeout, clearTimeout }));
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function visibility(hidden: boolean) {
    page.hidden = hidden;
    page.dispatchEvent(new Event("visibilitychange"));
  }

  function suspendFor(milliseconds: number) {
    // Advance elapsed time without delivering suspended browser callbacks.
    vi.setSystemTime(Date.now() + milliseconds);
  }

  it("locks on the normal idle deadline and can monitor later activity", () => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    vi.advanceTimersByTime(IDLE_MS);
    expect(lock).toHaveBeenCalledExactlyOnceWith("idle");
    browser.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(IDLE_MS);
    expect(lock).toHaveBeenCalledTimes(2);
  });

  it("checks an overdue idle deadline before accepting renewed activity", () => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    suspendFor(IDLE_MS);
    browser.dispatchEvent(new Event("keydown"));
    expect(lock).toHaveBeenCalledExactlyOnceWith("idle");
  });

  it("locks at the hidden deadline, including an initially hidden page", () => {
    page.hidden = true;
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    vi.advanceTimersByTime(HIDDEN_MS);
    expect(lock).toHaveBeenCalledExactlyOnceWith("hidden");
  });

  it("checks an overdue hidden deadline before restoring visibility", () => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    visibility(true);
    suspendFor(HIDDEN_MS);
    visibility(false);
    browser.dispatchEvent(new Event("focus"));
    browser.dispatchEvent(new Event("pageshow"));
    expect(lock).toHaveBeenCalledExactlyOnceWith("hidden");
  });

  it.each(["focus", "pageshow"])("checks expiration on %s without a visibility change", (eventName) => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    suspendFor(IDLE_MS + 1);
    browser.dispatchEvent(new Event(eventName));
    expect(lock).toHaveBeenCalledExactlyOnceWith("idle");
  });

  it("renews activity before expiration and permits a short background transition", () => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    vi.advanceTimersByTime(IDLE_MS - 1);
    browser.dispatchEvent(new Event("touchstart"));
    vi.advanceTimersByTime(2);
    visibility(true);
    vi.advanceTimersByTime(HIDDEN_MS - 1);
    visibility(false);
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(lock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(lock).toHaveBeenCalledExactlyOnceWith("idle");
  });

  it("does not renew a hidden deadline on repeated lifecycle events", () => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    visibility(true);
    vi.advanceTimersByTime(HIDDEN_MS - 1);
    visibility(true);
    browser.dispatchEvent(new Event("pageshow"));
    vi.advanceTimersByTime(1);
    expect(lock).toHaveBeenCalledExactlyOnceWith("hidden");
  });

  it("removes timers and every event listener on unsubscribe", () => {
    const lock = vi.fn();
    unsubscribe = subscribeToSensitivePageLock(lock);
    unsubscribe();
    for (const eventName of ["keydown", "pointerdown", "touchstart", "focus", "pageshow"]) {
      browser.dispatchEvent(new Event(eventName));
    }
    visibility(true);
    vi.runAllTimers();
    expect(lock).not.toHaveBeenCalled();
  });
});
