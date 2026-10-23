import { describe, expect, it } from "vitest";
import { addDays, diffDays, isValidDay, minutesToHHMM, romeDay, romeInstant, romeMinutesOfDay } from "./rome";

describe("romeDay", () => {
  it("uses Rome's calendar day, not UTC", () => {
    // 22:30 UTC del 24/10 = 00:30 del 25/10 a Roma (CEST, +2)
    expect(romeDay(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(romeDay(new Date("2026-10-24T21:59:00Z"))).toBe("2026-10-24");
  });
});

describe("romeInstant", () => {
  it("handles summer time (+2)", () => {
    expect(romeInstant("2026-10-24", 480).toISOString()).toBe("2026-10-24T06:00:00.000Z");
  });
  it("handles the day summer time ends (25/10/2026, +1 from 03:00)", () => {
    expect(romeInstant("2026-10-25", 480).toISOString()).toBe("2026-10-25T07:00:00.000Z");
  });
  it("handles the day summer time starts (28/03/2027)", () => {
    expect(romeInstant("2027-03-27", 480).toISOString()).toBe("2027-03-27T07:00:00.000Z");
    expect(romeInstant("2027-03-28", 480).toISOString()).toBe("2027-03-28T06:00:00.000Z");
  });
  it("round-trips with romeMinutesOfDay", () => {
    const t = romeInstant("2026-10-25", 22 * 60 + 45);
    expect(romeDay(t)).toBe("2026-10-25");
    expect(romeMinutesOfDay(t)).toBe(1365);
  });
});

describe("romeMinutesOfDay", () => {
  it("returns 0 at Rome midnight", () => {
    expect(romeMinutesOfDay(new Date("2026-11-01T23:00:00Z"))).toBe(0);
  });
});

describe("day arithmetic", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-10-20", 14)).toBe("2026-11-03");
  });
  it("counts calendar days regardless of DST", () => {
    expect(diffDays("2026-10-20", "2026-11-03")).toBe(14);
    expect(diffDays("2026-11-03", "2026-10-20")).toBe(-14);
  });
  it("formats minutes as HH:MM", () => {
    expect(minutesToHHMM(480)).toBe("08:00");
    expect(minutesToHHMM(1380)).toBe("23:00");
    expect(minutesToHHMM(615)).toBe("10:15");
  });
});

describe("isValidDay", () => {
  it("accepts real calendar days", () => {
    expect(isValidDay("2026-11-02")).toBe(true);
    expect(isValidDay("2028-02-29")).toBe(true);
  });
  it("rejects impossible or malformed values", () => {
    expect(isValidDay("2027-02-29")).toBe(false);
    expect(isValidDay("2026-13-45")).toBe(false);
    expect(isValidDay("abc")).toBe(false);
    expect(isValidDay("")).toBe(false);
    expect(isValidDay(undefined)).toBe(false);
  });
});
