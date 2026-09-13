/**
 * ─── STATE ↔ DATABASE MIRROR ─────────────────────────────────────────────────
 * `useSynced` is a drop-in replacement for `useState<T[]>` that also writes
 * every change to Supabase.
 *
 * This is what let the store keep its original shape: actions such as
 * `addPurchase` still compute stock deltas in memory exactly as before, and the
 * mirror turns the resulting state change into the right INSERT / UPDATE /
 * DELETE. Nothing in the business logic had to learn about the database.
 *
 * Writes are serialised through one queue so that, for example, an invoice is
 * always written before the payment that settles it.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Mapper } from './repository';
import { syncCollection, syncValueList, saveSettings, saveWebContacts } from './repository';
import type { StoreSettings, WebContacts } from '../types';

// ─── Serialised write queue ─────────────────────────────────────────────────
let queue: Promise<unknown> = Promise.resolve();
let onError: ((e: unknown) => void) | null = null;

export const setSyncErrorHandler = (fn: (e: unknown) => void) => { onError = fn; };

export const enqueue = (task: () => Promise<unknown>): Promise<unknown> => {
  queue = queue
    .then(task)
    .catch(e => {
      // A rejected write must not poison the queue for everything after it.
      console.error('[sync]', e);
      onError?.(e);
    });
  return queue;
};

/** Resolves once every queued write has been flushed. */
export const flushSync = (): Promise<unknown> => queue;

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * A collection mirrored to one table.
 * Returns the usual [state, setState] plus `hydrate`, which loads rows from the
 * database without treating them as a local change to push back.
 */
export function useSynced<T extends { id: string }>(
  mapper: Mapper<T>,
  live: boolean
): [T[], Setter<T[]>, (rows: T[]) => void] {
  const [state, setState] = useState<T[]>([]);
  const previous = useRef<T[]>([]);
  const skipNext = useRef(true);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; previous.current = state; return; }
    const before = previous.current;
    previous.current = state;
    if (!live || before === state) return;
    enqueue(() => syncCollection(mapper, before, state));
  }, [state, live]);

  const hydrate = useCallback((rows: T[]) => {
    skipNext.current = true;
    previous.current = rows;
    setState(rows);
  }, []);

  return [state, setState, hydrate];
}

/** A plain string list (shapes, calibres) mirrored to a one-column table. */
export function useSyncedList(
  table: string, column: string, live: boolean
): [string[], Setter<string[]>, (rows: string[]) => void] {
  const [state, setState] = useState<string[]>([]);
  const previous = useRef<string[]>([]);
  const skipNext = useRef(true);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; previous.current = state; return; }
    const before = previous.current;
    previous.current = state;
    if (!live || before === state) return;
    enqueue(() => syncValueList(table, column, before, state));
  }, [state, live]);

  const hydrate = useCallback((rows: string[]) => {
    skipNext.current = true;
    previous.current = rows;
    setState(rows);
  }, []);

  return [state, setState, hydrate];
}

/** The single settings row, plus the minimal-weight threshold stored beside it. */
export function useSyncedSettings(
  initial: StoreSettings, initialWeight: number, live: boolean
): {
  settings: StoreSettings; setSettings: Setter<StoreSettings>;
  minimalWeight: number; setMinimalWeight: Setter<number>;
  hydrate: (s: StoreSettings, w: number) => void;
} {
  const [settings, setSettings] = useState<StoreSettings>(initial);
  const [minimalWeight, setMinimalWeight] = useState<number>(initialWeight);
  const skipNext = useRef(true);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    if (!live) return;
    enqueue(() => saveSettings(settings, minimalWeight));
  }, [settings, minimalWeight, live]);

  const hydrate = useCallback((s: StoreSettings, w: number) => {
    skipNext.current = true;
    setSettings(s);
    setMinimalWeight(w);
  }, []);

  return { settings, setSettings, minimalWeight, setMinimalWeight, hydrate };
}

/** The single web-contacts row. */
export function useSyncedContacts(
  initial: WebContacts, live: boolean
): [WebContacts, Setter<WebContacts>, (c: WebContacts) => void] {
  const [state, setState] = useState<WebContacts>(initial);
  const skipNext = useRef(true);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    if (!live) return;
    enqueue(() => saveWebContacts(state));
  }, [state, live]);

  const hydrate = useCallback((c: WebContacts) => {
    skipNext.current = true;
    setState(c);
  }, []);

  return [state, setState, hydrate];
}
