import { describe, expect, it } from "vitest";
import { isBlocked, strikeConsequence } from "./strikes";

describe("strikes", () => {
  it("blocks only with 2+ strikes and something still unpaid", () => {
    expect(isBlocked(1, 1)).toBe(false);
    expect(isBlocked(2, 1)).toBe(true);
    expect(isBlocked(2, 0)).toBe(false);
    expect(isBlocked(5, 1)).toBe(true);
  });
  it("warns on the first strike and blocks from the second", () => {
    expect(strikeConsequence(1)).toBe("WARNING");
    expect(strikeConsequence(2)).toBe("BLOCK");
    expect(strikeConsequence(3)).toBe("BLOCK");
  });
});
