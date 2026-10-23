import { describe, expect, it } from "vitest";
import { overlaps, quarterRows } from "./grid";

describe("grid", () => {
  it("lists quarter rows from opening to the last quarter before closing", () => {
    const rows = quarterRows(480, 1380);
    expect(rows[0]).toBe(480);
    expect(rows.at(-1)).toBe(1365);
    expect(rows).toHaveLength(60);
  });
  it("treats touching intervals as not overlapping", () => {
    expect(overlaps({ startMin: 600, endMin: 660 }, { startMin: 660, endMin: 720 })).toBe(false);
    expect(overlaps({ startMin: 600, endMin: 660 }, { startMin: 645, endMin: 720 })).toBe(true);
  });
});
