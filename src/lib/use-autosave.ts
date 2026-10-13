import { useCallback, useEffect, useRef, useState } from "react";

export type SaveHint = "saving" | "saved" | "error";

export function useKeyedAutosave<T>(
  save: (key: string, value: T) => Promise<void>,
  onError: (key: string, error: unknown) => void,
  delayMs = 450,
) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const valuesRef = useRef<Record<string, T>>({});
  const genRef = useRef<Record<string, number>>({});
  const timersRef = useRef<Record<string, number>>({});
  const chainRef = useRef<Record<string, Promise<void>>>({});
  const dirtyRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  const [hints, setHints] = useState<Record<string, SaveHint>>({});

  const persist = useCallback((key: string, value: T, gen: number) => {
    const run = async () => {
      if (genRef.current[key] !== gen) return;
      try {
        await saveRef.current(key, value);
        if (!mountedRef.current || genRef.current[key] !== gen) return;
        dirtyRef.current.delete(key);
        setHints((current) => ({ ...current, [key]: "saved" }));
      } catch (error) {
        if (!mountedRef.current || genRef.current[key] !== gen) return;
        dirtyRef.current.add(key);
        setHints((current) => ({ ...current, [key]: "error" }));
        onErrorRef.current(key, error);
      }
    };
    const previous = chainRef.current[key] ?? Promise.resolve();
    const next = previous.then(run, run);
    chainRef.current[key] = next;
    return next;
  }, []);

  const flushKey = useCallback(
    (key: string) => {
      window.clearTimeout(timersRef.current[key]);
      delete timersRef.current[key];
      if (!dirtyRef.current.has(key)) return Promise.resolve();
      const value = valuesRef.current[key];
      if (value === undefined) return Promise.resolve();
      return persist(key, value, genRef.current[key] ?? 0);
    },
    [persist],
  );

  const flush = useCallback(() => {
    return Promise.all([...dirtyRef.current].map((key) => flushKey(key))).then(() => undefined);
  }, [flushKey]);

  const queue = useCallback(
    (key: string, value: T, immediate = false) => {
      valuesRef.current[key] = value;
      dirtyRef.current.add(key);
      const gen = (genRef.current[key] ?? 0) + 1;
      genRef.current[key] = gen;
      window.clearTimeout(timersRef.current[key]);
      setHints((current) => ({ ...current, [key]: "saving" }));
      if (immediate) {
        void persist(key, value, gen);
        return;
      }
      timersRef.current[key] = window.setTimeout(() => {
        void persist(key, value, gen);
      }, delayMs);
    },
    [delayMs, persist],
  );

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const dirty = dirtyRef.current;
    return () => {
      mountedRef.current = false;
      for (const key of [...dirty]) {
        window.clearTimeout(timers[key]);
        const value = valuesRef.current[key];
        if (value !== undefined) void persist(key, value, genRef.current[key] ?? 0);
      }
    };
  }, [persist]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (dirtyRef.current.size === 0) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  return { hints, queue, flushKey, flush };
}
