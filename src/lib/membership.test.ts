import { describe, expect, it } from "vitest";
import { addYears, daysUntilExpiry, defaultExpiry, proposeRenewal } from "./membership";

describe("membership dates", () => {
  it("expires one year after issue", () => {
    expect(defaultExpiry("2026-10-13")).toBe("2027-10-13");
  });
  it("clamps 29 February", () => {
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
  });
  it("early renewal keeps the remaining days", () => {
    expect(proposeRenewal("2026-10-01", "2026-10-20")).toEqual({ issueDate: "2026-10-01", expiryDate: "2027-10-20" });
  });
  it("late renewal starts from today", () => {
    expect(proposeRenewal("2026-10-01", "2026-03-01")).toEqual({ issueDate: "2026-10-01", expiryDate: "2027-10-01" });
  });
  it("counts days to expiry", () => {
    expect(daysUntilExpiry("2026-10-28", "2026-10-13")).toBe(15);
    expect(daysUntilExpiry("2026-10-10", "2026-10-13")).toBe(-3);
  });
});
