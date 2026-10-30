import { DATA_GLYPHS, scrambledText } from "./motion";

const MS_PER_CHARACTER = 20;
const FRAME_INTERVAL_MS = 45;

function randomGlyph(): string {
  const index = Math.floor(Math.random() * DATA_GLYPHS.length);
  return DATA_GLYPHS[index];
}

interface DecodingText {
  node: Text;
  finalText: string;
}

/** The text nodes inside an element, so the visible text can change without replacing nodes. */
function textNodesIn(element: Element): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current !== null) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

/**
 * Makes text look like it decodes from data glyphs into the real words.
 *
 * Only the value of the existing text nodes changes (React keeps owning the nodes), and the
 * real text is always put back: when the decode ends, or straight away when `finish` is called.
 */
export function decodeText(elements: Element[]): { finish: () => void } {
  const texts: DecodingText[] = [];
  for (const element of elements) {
    for (const node of textNodesIn(element)) {
      texts.push({ node, finalText: node.nodeValue ?? "" });
    }
  }

  const startTime = performance.now();
  let lastFrameTime = 0;
  let frameRequest = 0;
  let finished = false;

  function finish() {
    if (finished) {
      return;
    }
    finished = true;
    cancelAnimationFrame(frameRequest);
    for (const text of texts) {
      text.node.nodeValue = text.finalText;
    }
  }

  function drawFrame(now: number) {
    if (finished) {
      return;
    }

    if (now - lastFrameTime >= FRAME_INTERVAL_MS) {
      lastFrameTime = now;
      const elapsedMs = now - startTime;

      let allSettled = true;
      for (const text of texts) {
        const shown = scrambledText(text.finalText, elapsedMs, MS_PER_CHARACTER, randomGlyph);
        text.node.nodeValue = shown;
        if (shown !== text.finalText) {
          allSettled = false;
        }
      }

      if (allSettled) {
        finish();
        return;
      }
    }

    frameRequest = requestAnimationFrame(drawFrame);
  }

  drawFrame(startTime);
  return { finish };
}
