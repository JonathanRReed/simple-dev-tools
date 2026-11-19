import { createElement, useSyncExternalStore, type ComponentType } from "react";

/**
 * A component whose code is loaded after the page is interactive.
 *
 * This is deliberately not `React.lazy` / `next/dynamic`. Those reveal the
 * component through a Suspense boundary, and React holds a boundary's content
 * back for up to 300 ms after it resolves so fallbacks do not flicker. For
 * something opened by a click or a keypress that hold is pure lag: measured
 * here, a drawer whose code was already in memory still took 325 ms to
 * appear. With this helper there is no boundary. Once the module has loaded,
 * mounting it is synchronous.
 *
 *   const palette = deferComponent(() => import("./CommandPalette"));
 *   palette.load();              // start (or reuse) the download
 *   <palette.Component {...p} /> // renders nothing until it has arrived
 *   palette.useLoaded();         // true once it has
 */
export function deferComponent<Props extends object>(
  loader: () => Promise<{ default: ComponentType<Props> }>
) {
  let loaded: ComponentType<Props> | null = null;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const load = (): Promise<void> => {
    pending ??= loader().then(
      (module) => {
        loaded = module.default;
        for (const notify of listeners) notify();
      },
      () => {
        // Offline or a failed fetch: forget the attempt so the next call retries.
        pending = null;
      }
    );
    return pending;
  };

  const subscribe = (notify: () => void) => {
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  };

  /** True once the module has arrived. Always false on the server. */
  const useLoaded = (): boolean =>
    useSyncExternalStore(
      subscribe,
      () => loaded !== null,
      () => false
    );

  /** The loaded component, or nothing while it is still on its way. */
  function Component(props: Props) {
    const ready = useLoaded();
    return ready && loaded ? createElement(loaded, props) : null;
  }

  return { load, useLoaded, Component };
}
