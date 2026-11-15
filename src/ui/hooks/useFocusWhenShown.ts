"use client";

import { useEffect, type RefObject } from "react";
import { isSplitView } from "@/ui/screen-size";

/**
 * Moves keyboard focus to an element once it is shown, in the split view only.
 *
 * In the split view the answer appears beside the search, so keyboard and screen-reader users
 * would not notice it changed. Focusing the movie's title means the next Tab reaches the
 * services. Phones open a new screen, which already starts from the top.
 */
export function useFocusWhenShown(elementRef: RefObject<HTMLElement | null>, isShown: boolean) {
  useEffect(() => {
    if (!isShown || !isSplitView()) {
      return;
    }
    elementRef.current?.focus();
  }, [elementRef, isShown]);
}
