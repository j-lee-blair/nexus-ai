import { describe, expect, it } from "vitest";
import { easeOut, pointBeyondEdge, pointOnCurve, scrambledText } from "./motion";

describe("easeOut", () => {
  it("starts at 0, ends at 1 and stays inside that range", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });
});

describe("pointOnCurve", () => {
  it("starts at the start and ends at the end", () => {
    const start = { x: 0, y: 0 };
    const control = { x: 50, y: 100 };
    const end = { x: 100, y: 0 };

    expect(pointOnCurve(start, control, end, 0)).toEqual(start);
    expect(pointOnCurve(start, control, end, 1)).toEqual(end);
  });
});

describe("pointBeyondEdge", () => {
  it("always lies outside the screen", () => {
    const width = 390;
    const height = 844;

    for (let attempt = 0; attempt < 50; attempt++) {
      const point = pointBeyondEdge(width, height, Math.random);
      const isOutside = point.x < 0 || point.x > width || point.y < 0 || point.y > height;
      expect(isOutside).toBe(true);
    }
  });
});

describe("scrambledText", () => {
  const glyph = () => "#";

  it("settles characters from the left as time passes, keeping spaces", () => {
    expect(scrambledText("SF Anytime", 0, 10, glyph)).toBe("## #######");
    expect(scrambledText("SF Anytime", 40, 10, glyph)).toBe("SF A######");
    expect(scrambledText("SF Anytime", 1000, 10, glyph)).toBe("SF Anytime");
  });
});
