import { useEffect } from "react";

export function useDebounce(
  fn: () => void,
  deps: any[],
  delay = 500
) {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
  }, deps);
}
