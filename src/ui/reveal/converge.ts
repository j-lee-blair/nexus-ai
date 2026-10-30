// The Converge reveal, drawn on a canvas laid over the answer (CLAUDE.md "Experience design").
//
// Discovery: while Nexus fetches a fresh answer, streams of light pour in from the screen edges
// and meet at the nexus point. When the answer arrives, one stream per real offer fans out from
// the nexus point to that offer's row. Snap ("Ignite"): for a cached answer, a gradient line
// flashes across the nexus point and the answer opens up and down from it.
//
// The canvas is decoration only. The answer itself is ordinary HTML underneath.

import { easeOut, pointBeyondEdge, pointOnCurve, type Point } from "./motion";

/** Where a stream lands, and what to do when it gets there. */
export interface StreamTarget {
  point: Point;
  hue: number;
  onArrive: () => void;
}

export interface Discovery {
  /** Fans streams out from the nexus point to each target, then fades the overlay. */
  resolve: (nexus: Point, targets: StreamTarget[], onDone: () => void) => void;
  /** Stops straight away and clears the overlay. */
  stop: () => void;
}

interface Stream {
  start: Point;
  control: Point;
  end: Point;
  hue: number;
  startTime: number;
  durationMs: number;
  /** How much of the path the glowing tail covers, 0–1. */
  tailLength: number;
  target: StreamTarget | null;
  arrived: boolean;
}

const INCOMING_DURATION_MS = 700;
const NEW_STREAM_EVERY_MS = 110;
const OUTGOING_DURATION_MS = 460;
const OUTGOING_STAGGER_MS = 45;
const MAX_OUTGOING_STAGGER_MS = 300;
const NEXUS_MOVE_MS = 160;
const FADE_OUT_MS = 220;
const TAIL_SEGMENTS = 14;
const CYAN = "92, 242, 255";
const MAGENTA = "255, 92, 207";

function randomBetween(low: number, high: number): number {
  return low + Math.random() * (high - low);
}

interface Surface {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/** Sizes the canvas to the viewport, sharp on high-density screens. */
function prepareCanvas(canvas: HTMLCanvasElement): Surface | null {
  const context = canvas.getContext("2d");
  if (context === null) {
    return null;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.opacity = "1";
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (context !== null) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function fadeOutCanvas(canvas: HTMLCanvasElement, onFaded: () => void) {
  const fade = canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT_MS, fill: "forwards" });
  fade.onfinish = () => {
    clearCanvas(canvas);
    fade.cancel();
    onFaded();
  };
}

/** Draws one stream as a tail that gets brighter and thicker towards its head. */
function drawStream(context: CanvasRenderingContext2D, stream: Stream, progress: number) {
  const tailStart = Math.max(0, progress - stream.tailLength);

  for (let segment = 1; segment <= TAIL_SEGMENTS; segment++) {
    const fromProgress = tailStart + ((progress - tailStart) * (segment - 1)) / TAIL_SEGMENTS;
    const toProgress = tailStart + ((progress - tailStart) * segment) / TAIL_SEGMENTS;
    const from = pointOnCurve(stream.start, stream.control, stream.end, fromProgress);
    const to = pointOnCurve(stream.start, stream.control, stream.end, toProgress);
    const strength = segment / TAIL_SEGMENTS;

    context.strokeStyle = `hsla(${stream.hue}, 95%, 65%, ${strength})`;
    context.lineWidth = 1 + 2.5 * strength;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  const head = pointOnCurve(stream.start, stream.control, stream.end, progress);
  context.fillStyle = `hsl(${stream.hue}, 100%, 85%)`;
  context.beginPath();
  context.arc(head.x, head.y, 3, 0, Math.PI * 2);
  context.fill();
}

/** The glowing nexus point. It grows a little with every stream that reaches it. */
function drawNexus(context: CanvasRenderingContext2D, nexus: Point, energy: number, timeMs: number) {
  const pulse = Math.sin(timeMs / 60) * 2;
  const radius = (8 + Math.min(energy, 10) * 2 + pulse) * 3;

  const glow = context.createRadialGradient(nexus.x, nexus.y, 0, nexus.x, nexus.y, radius);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  glow.addColorStop(0.3, `rgba(${CYAN}, 0.6)`);
  glow.addColorStop(1, `rgba(${MAGENTA}, 0)`);

  context.fillStyle = glow;
  context.beginPath();
  context.arc(nexus.x, nexus.y, radius, 0, Math.PI * 2);
  context.fill();
}

/** Starts the Discovery streams. They keep gathering at `nexus` until `resolve` is called. */
export function startDiscovery(canvas: HTMLCanvasElement, nexus: Point): Discovery {
  const surface = prepareCanvas(canvas);
  if (surface === null) {
    return {
      resolve: (_nexus, targets, onDone) => {
        targets.forEach((target) => target.onArrive());
        onDone();
      },
      stop: () => {},
    };
  }

  const { context, width, height } = surface;
  const startTime = performance.now();
  const streams: Stream[] = [];

  let currentNexus = nexus;
  let nexusMoveFrom = nexus;
  let nexusMoveTo = nexus;
  let nexusMoveStart = 0;
  let isGathering = true;
  let lastSpawnTime = -Infinity;
  let energy = 0;
  let frameRequest = 0;
  let stopped = false;
  let whenAllLanded: (() => void) | null = null;

  function addIncomingStream(now: number) {
    const start = pointBeyondEdge(width, height, Math.random);
    const control = {
      x: (start.x + currentNexus.x) / 2 + randomBetween(-120, 120),
      y: (start.y + currentNexus.y) / 2 + randomBetween(-120, 120),
    };
    streams.push({
      start,
      control,
      end: currentNexus,
      hue: randomBetween(170, 330),
      startTime: now,
      durationMs: randomBetween(INCOMING_DURATION_MS - 150, INCOMING_DURATION_MS + 150),
      tailLength: 0.35,
      target: null,
      arrived: false,
    });
  }

  function updateNexusPosition(now: number) {
    const progress = easeOut((now - nexusMoveStart) / NEXUS_MOVE_MS);
    currentNexus = {
      x: nexusMoveFrom.x + (nexusMoveTo.x - nexusMoveFrom.x) * progress,
      y: nexusMoveFrom.y + (nexusMoveTo.y - nexusMoveFrom.y) * progress,
    };
  }

  function drawFrame(now: number) {
    if (stopped) {
      return;
    }

    if (isGathering && now - lastSpawnTime >= NEW_STREAM_EVERY_MS) {
      lastSpawnTime = now;
      addIncomingStream(now);
    }
    updateNexusPosition(now);

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";

    let streamsStillMoving = 0;
    for (const stream of streams) {
      const progress = easeOut((now - stream.startTime) / stream.durationMs);
      if (progress <= 0) {
        streamsStillMoving++;
        continue;
      }

      if (progress >= 1) {
        if (!stream.arrived) {
          stream.arrived = true;
          if (stream.target === null) {
            energy++;
          } else {
            stream.target.onArrive();
          }
        }
        continue;
      }

      streamsStillMoving++;
      drawStream(context, stream, progress);
    }

    drawNexus(context, currentNexus, energy, now - startTime);
    context.globalCompositeOperation = "source-over";

    if (whenAllLanded !== null && streamsStillMoving === 0) {
      const onLanded = whenAllLanded;
      whenAllLanded = null;
      onLanded();
      return;
    }

    frameRequest = requestAnimationFrame(drawFrame);
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(frameRequest);
    clearCanvas(canvas);
  }

  function resolve(answerNexus: Point, targets: StreamTarget[], onDone: () => void) {
    const now = performance.now();
    isGathering = false;
    nexusMoveFrom = currentNexus;
    nexusMoveTo = answerNexus;
    nexusMoveStart = now;

    targets.forEach((target, index) => {
      const delay = Math.min(index * OUTGOING_STAGGER_MS, MAX_OUTGOING_STAGGER_MS);
      streams.push({
        start: answerNexus,
        control: { x: answerNexus.x + randomBetween(-40, 40), y: target.point.y },
        end: target.point,
        hue: target.hue,
        startTime: now + NEXUS_MOVE_MS / 2 + delay,
        durationMs: OUTGOING_DURATION_MS,
        tailLength: 0.25,
        target,
        arrived: false,
      });
    });

    whenAllLanded = () => {
      fadeOutCanvas(canvas, () => {
        // Skipped while fading: whoever stopped it has already finished the reveal.
        if (stopped) {
          return;
        }
        stopped = true;
        onDone();
      });
    };
  }

  frameRequest = requestAnimationFrame(drawFrame);
  return { resolve, stop };
}

const IGNITE_DURATION_MS = 240;
const IGNITE_LINE_GROWS_MS = 70;

/**
 * The Ignite snap for a cached answer: a gradient line flashes across the nexus point and the
 * answer opens upward and downward from it. Returns a function that ends it immediately.
 */
export function playIgnite(canvas: HTMLCanvasElement, nexus: Point, answer: HTMLElement, onDone: () => void) {
  const answerBox = answer.getBoundingClientRect();
  const lineFromTop = Math.max(0, nexus.y - answerBox.top);
  const lineFromBottom = Math.max(0, answerBox.height - lineFromTop - 2);
  const closed = `inset(${lineFromTop}px 0 ${lineFromBottom}px 0)`;

  const opening = answer.animate(
    [
      { clipPath: closed, filter: "brightness(1.8)" },
      { clipPath: closed, filter: "brightness(1.8)", offset: 0.25 },
      { clipPath: "inset(0 0 0 0)", filter: "none" },
    ],
    { duration: IGNITE_DURATION_MS, easing: "cubic-bezier(.2,.8,.2,1)" },
  );

  const surface = prepareCanvas(canvas);
  const startTime = performance.now();
  let frameRequest = 0;
  let finished = false;

  function finish() {
    if (finished) {
      return;
    }
    finished = true;
    cancelAnimationFrame(frameRequest);
    opening.cancel();
    clearCanvas(canvas);
    onDone();
  }

  function drawFrame(now: number) {
    if (finished || surface === null) {
      return;
    }
    const { context, width, height } = surface;
    const elapsed = now - startTime;
    const growth = Math.min(1, elapsed / IGNITE_LINE_GROWS_MS);
    const fade = Math.max(0, 1 - (elapsed - 60) / 170);

    context.clearRect(0, 0, width, height);

    const line = context.createLinearGradient(0, 0, width, 0);
    line.addColorStop(0, `rgba(${CYAN}, 0)`);
    line.addColorStop(0.25, `rgb(${CYAN})`);
    line.addColorStop(0.5, "#fff");
    line.addColorStop(0.75, `rgb(${MAGENTA})`);
    line.addColorStop(1, `rgba(${MAGENTA}, 0)`);

    const lineWidth = width * growth;
    context.globalAlpha = fade;
    context.fillStyle = line;
    context.fillRect(nexus.x - lineWidth / 2, nexus.y - 1.5, lineWidth, 3);

    context.globalAlpha = fade * 0.5;
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(nexus.x, nexus.y, 6 + 10 * growth, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    if (elapsed > IGNITE_DURATION_MS) {
      finish();
      return;
    }
    frameRequest = requestAnimationFrame(drawFrame);
  }

  frameRequest = requestAnimationFrame(drawFrame);
  return finish;
}
