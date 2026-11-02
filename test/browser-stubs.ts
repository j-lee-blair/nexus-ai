// jsdom (the browser stand-in used by the screen tests) has no canvas drawing and no Web
// Animations API. These stubs fill the gaps so the screens and the Converge reveal can run.
// Only the decoration is faked; the answer markup the tests check is real.

import { vi } from "vitest";

interface FakeAnimation {
  onfinish: (() => void) | null;
  cancel: () => void;
}

/** Finishes straight after it starts, like a very short animation. */
function fakeAnimation(): FakeAnimation {
  const animation: FakeAnimation = { onfinish: null, cancel: () => {} };
  setTimeout(() => {
    if (animation.onfinish !== null) {
      animation.onfinish();
    }
  }, 0);
  return animation;
}

/**
 * Installs the stubs. `reducedMotion` decides what prefers-reduced-motion reports; the split
 * view media query always reports a phone, so tests see the phone layout's behaviour.
 */
export function installBrowserStubs({ reducedMotion = false } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => {
    let matches = false;
    if (query === "(prefers-reduced-motion: reduce)") {
      matches = reducedMotion;
    }
    return { matches, media: query };
  });

  // No 2D context: the reveal then skips drawing, which it already supports.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  Element.prototype.animate = (() => fakeAnimation()) as unknown as typeof Element.prototype.animate;
}
