import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { afterPaint, type Schedulers } from "./after-paint";

// Fake timers stand in for both queues: a frame is a 16 ms timeout, a task a 0 ms one.
const schedulers: Schedulers = {
  frame: (cb) => setTimeout(cb, 16) as unknown as number,
  cancelFrame: (id) => clearTimeout(id),
  task: (cb) => setTimeout(cb, 0) as unknown as number,
  cancelTask: (id) => clearTimeout(id),
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("afterPaint", () => {
  it("applies several values within one frame once, with the last value", () => {
    const apply = vi.fn();
    const updates = afterPaint(apply, schedulers);
    updates.push(6.5);
    updates.push(7);
    updates.push(7.5);
    vi.advanceTimersByTime(16);
    expect(apply).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledExactlyOnceWith(7.5);
  });

  it("schedules again for values pushed after an apply", () => {
    const apply = vi.fn();
    const updates = afterPaint(apply, schedulers);
    updates.push(6.5);
    vi.runAllTimers();
    updates.push(8);
    vi.runAllTimers();
    expect(apply.mock.calls).toEqual([[6.5], [8]]);
  });

  it("takes a value pushed between the frame and the task", () => {
    const apply = vi.fn();
    const updates = afterPaint(apply, schedulers);
    updates.push(6.5);
    vi.advanceTimersByTime(16);
    updates.push(9);
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledExactlyOnceWith(9);
  });

  it("drops a waiting value on cancel", () => {
    const apply = vi.fn();
    const updates = afterPaint(apply, schedulers);
    updates.push(6.5);
    updates.cancel();
    vi.runAllTimers();
    expect(apply).not.toHaveBeenCalled();
    updates.push(7);
    vi.advanceTimersByTime(16);
    updates.cancel();
    vi.runAllTimers();
    expect(apply).not.toHaveBeenCalled();
  });
});
