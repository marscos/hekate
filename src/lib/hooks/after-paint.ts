// Coalesces rapid updates (such as slider drags) into one per frame, run after
// the frame paints so the control's own movement reaches the screen first
// (change: smooth-bpm-tolerance-slider, design D2).

export interface Schedulers {
  frame: (cb: () => void) => number;
  cancelFrame: (id: number) => void;
  task: (cb: () => void) => number;
  cancelTask: (id: number) => void;
}

const browser: Schedulers = {
  frame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
  task: (cb) => window.setTimeout(cb, 0),
  cancelTask: (id) => window.clearTimeout(id),
};

export interface AfterPaint<T> {
  /** Queues `value`, replacing any value still waiting to be applied. */
  push(value: T): void;
  /** Drops the waiting value, if any, without applying it. */
  cancel(): void;
}

/** Applies only the latest pushed value, once, after the next paint. */
export function afterPaint<T>(apply: (value: T) => void, schedulers: Schedulers = browser): AfterPaint<T> {
  let pending: { value: T } | null = null;
  let frame: number | null = null;
  let task: number | null = null;

  function run() {
    task = null;
    const p = pending;
    pending = null;
    if (p) apply(p.value);
  }

  return {
    push(value) {
      pending = { value };
      if (frame !== null || task !== null) return;
      frame = schedulers.frame(() => {
        frame = null;
        task = schedulers.task(run);
      });
    },
    cancel() {
      pending = null;
      if (frame !== null) schedulers.cancelFrame(frame);
      if (task !== null) schedulers.cancelTask(task);
      frame = task = null;
    },
  };
}
