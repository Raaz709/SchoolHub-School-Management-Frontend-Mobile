import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** HTTP status of the failure, or `null` when the request never reached the API. */
  status: number | null;
}

export interface AsyncResult<T> extends AsyncState<T> {
  refetch: () => void;
}

/**
 * Runs an async factory on mount and whenever `deps` change, cancelling the
 * previous run so a fast screen switch can never land a stale response.
 *
 * Equivalent to the website's `useAsync`, minus TanStack Query: mobile screens
 * are short-lived and pull-to-refresh replaces window-focus refetching.
 */
export function useAsync<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
    status: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null, status: null }));

    try {
      const data = await factoryRef.current(controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;
      setState({ data, loading: false, error: null, status: null });
    } catch (error) {
      if (controller.signal.aborted || !mountedRef.current) return;
      const err = error instanceof Error ? error : new Error(String(error));
      setState({
        data: null,
        loading: false,
        error: err,
        status: err instanceof ApiError ? err.status : null,
      });
    }
  }, []);

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, ...deps]);

  return { ...state, refetch: execute };
}

/**
 * Imperative variant for reads that must not fire on mount — modal detail
 * fetches, report previews and anything triggered by a button.
 */
export function useLazyAsync<T>(
  factory: (signal: AbortSignal) => Promise<T>,
): AsyncState<T> & { execute: () => Promise<void>; reset: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    status: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const execute = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null, status: null }));

    try {
      const data = await factoryRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setState({ data, loading: false, error: null, status: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      setState({
        data: null,
        loading: false,
        error: err,
        status: err instanceof ApiError ? err.status : null,
      });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, loading: false, error: null, status: null });
  }, []);

  return { ...state, execute, reset };
}
