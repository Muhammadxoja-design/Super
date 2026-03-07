import { useEffect } from "react";

/**
 * Sets the page <title> for the current route.
 * Automatically restores the default on unmount.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
