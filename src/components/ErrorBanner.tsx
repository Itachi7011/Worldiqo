"use client";

import { useEffect, useRef, useState } from "react";

interface TrackedError {
  id: string;
  text: string;
}

export default function ErrorBanner({
  errors,
  autoDismissMs = 20000,
  className = "",
}: {
  errors: string[];
  /** How long each error stays visible before auto-clearing itself. */
  autoDismissMs?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState<TrackedError[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setVisible((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const additions = errors
        .filter((e) => !existingIds.has(e) && !dismissedRef.current.has(e))
        .map((e) => ({ id: e, text: e }));
      if (additions.length === 0) return prev;

      additions.forEach((a) => {
        const timer = setTimeout(() => {
          setVisible((cur) => cur.filter((x) => x.id !== a.id));
          timersRef.current.delete(a.id);
        }, autoDismissMs);
        timersRef.current.set(a.id, timer);
      });

      return [...prev, ...additions];
    });
  }, [errors, autoDismissMs]);

  // Clear all pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  function dismiss(id: string) {
    dismissedRef.current.add(id);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setVisible((cur) => cur.filter((x) => x.id !== id));
  }

  if (visible.length === 0) return null;

  return (
    <div className={className}>
      {visible.map((e) => (
        <div
          key={e.id}
          className="flex items-start gap-2 px-3 py-2 bg-signal-amber/10 border-b border-signal-amber/20"
        >
          <span className="flex-1 text-xs text-signal-amber font-mono leading-snug">
            ⚠ {e.text}
          </span>
          <button
            onClick={() => dismiss(e.id)}
            aria-label="Dismiss"
            className="shrink-0 text-signal-amber/70 hover:text-signal-amber leading-none text-sm px-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
