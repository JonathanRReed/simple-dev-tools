import { useEffect, useState } from "react";

/**
 * Becomes true the first time `value` is true and stays true afterwards.
 *
 * Used to mount something heavy (a dialog, a drawer) only once it has been
 * opened, and then keep it mounted so its close animation can run.
 */
export function useLatch(value: boolean): boolean {
  const [latched, setLatched] = useState(value);
  useEffect(() => {
    if (value) setLatched(true);
  }, [value]);
  return latched;
}
