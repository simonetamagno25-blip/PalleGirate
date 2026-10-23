import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { bookingEnd, bookingPrice, checkSchedule, quarterStarts } from "./schedule";
import type { RuleSettings } from "./types";

const S: RuleSettings = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2 };
const tennis = { slotMinutes: 60, active: true };
const football = { slotMinutes: 90, active: true };
const at = (hhmm: string, day = "2026-11-10") => {
  const [h, m] = hhmm.split(":").map(Number);
  return romeInstant(day, h * 60 + m);
};
const codes = (v: { code: string }[]) => v.map((x) => x.code);

describe("checkSchedule", () => {
  it("accepts starts on 15-minute boundaries", () => {
    for (const t of ["08:00", "08:15", "08:30", "08:45", "21:45"]) {
      expect(checkSchedule({ start: at(t), slots: 1 }, tennis, S), t).toEqual([]);
    }
  });
  it("rejects starts off the 15-minute grid", () => {
    expect(codes(checkSchedule({ start: at("08:10"), slots: 1 }, tennis, S))).toContain("START_NOT_ON_STEP");
    const withSeconds = new Date(at("08:15").getTime() + 30_000);
    expect(codes(checkSchedule({ start: withSeconds, slots: 1 }, tennis, S))).toContain("START_NOT_ON_STEP");
  });
  it("rejects starts before opening", () => {
    expect(codes(checkSchedule({ start: at("07:45"), slots: 1 }, tennis, S))).toEqual(["BEFORE_OPENING"]);
  });
  it("allows ending exactly at 23:00 and rejects ending after", () => {
    expect(checkSchedule({ start: at("22:00"), slots: 1 }, tennis, S)).toEqual([]);
    expect(codes(checkSchedule({ start: at("22:15"), slots: 1 }, tennis, S))).toEqual(["AFTER_CLOSING"]);
    expect(checkSchedule({ start: at("20:00"), slots: 2 }, football, S)).toEqual([]); // 20:00–23:00
    expect(codes(checkSchedule({ start: at("20:15"), slots: 2 }, football, S))).toEqual(["AFTER_CLOSING"]);
  });
  it("accepts 1 or 2 slots only", () => {
    expect(codes(checkSchedule({ start: at("10:00"), slots: 0 }, tennis, S))).toContain("INVALID_SLOTS");
    expect(codes(checkSchedule({ start: at("10:00"), slots: 3 }, tennis, S))).toContain("INVALID_SLOTS");
    expect(codes(checkSchedule({ start: at("10:00"), slots: 1.5 }, tennis, S))).toContain("INVALID_SLOTS");
    expect(checkSchedule({ start: at("10:00"), slots: 2 }, tennis, S)).toEqual([]);
  });
  it("rejects inactive fields", () => {
    expect(codes(checkSchedule({ start: at("10:00"), slots: 1 }, { ...tennis, active: false }, S))).toEqual(["FIELD_INACTIVE"]);
  });
  it("works on the DST change day", () => {
    expect(checkSchedule({ start: at("08:00", "2026-10-25"), slots: 1 }, tennis, S)).toEqual([]);
    expect(codes(checkSchedule({ start: at("07:00", "2026-10-25"), slots: 1 }, tennis, S))).toEqual(["BEFORE_OPENING"]);
  });
});

describe("bookingEnd, price and quarters", () => {
  it("computes end from slots", () => {
    expect(bookingEnd(at("10:00"), 2, football).getTime() - at("10:00").getTime()).toBe(180 * 60_000);
  });
  it("multiplies the slot price", () => {
    expect(bookingPrice(1800, 2)).toBe(3600);
  });
  it("lists every quarter hour of the interval", () => {
    const q = quarterStarts(at("10:00"), at("11:30"));
    expect(q).toHaveLength(6);
    expect(q[0].getTime()).toBe(at("10:00").getTime());
    expect(q[5].getTime()).toBe(at("11:15").getTime());
  });
  it("aligns quarters to the absolute 15-minute grid", () => {
    const q = quarterStarts(at("08:10"), at("09:10")).map((d) => d.getTime());
    expect(q).toEqual(["08:00", "08:15", "08:30", "08:45", "09:00"].map((h) => at(h).getTime()));
    const aligned = new Set(quarterStarts(at("08:00"), at("09:00")).map((d) => d.getTime()));
    expect(q.some((t) => aligned.has(t))).toBe(true);
  });
});
