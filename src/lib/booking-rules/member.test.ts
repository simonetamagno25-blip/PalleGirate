import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { canMemberChange, checkMemberRules, isLateCancellation } from "./member";
import type { MemberState, RuleSettings } from "./types";

const S: RuleSettings = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2 };
const OK: MemberState = { membershipExpiry: "2027-06-30", otherActiveBookings: 0, blocked: false };
const now = romeInstant("2026-11-02", 10 * 60); // lunedì 02/11/2026 10:00 Roma
const codes = (v: { code: string }[]) => v.map((x) => x.code);

describe("checkMemberRules", () => {
  it("accepts a normal booking", () => {
    expect(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, OK, now)).toEqual([]);
  });
  it("rejects starts in the past or right now", () => {
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-02", 600), slots: 1 }, S, OK, now))).toEqual(["IN_PAST"]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-02", 585), slots: 1 }, S, OK, now))).toEqual(["IN_PAST"]);
  });
  it("allows up to today + 14 calendar days, any time of that day", () => {
    expect(checkMemberRules({ start: romeInstant("2026-11-16", 22 * 60), slots: 1 }, S, OK, now)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-17", 480), slots: 1 }, S, OK, now))).toEqual(["TOO_FAR_AHEAD"]);
  });
  it("uses Rome's day for 'today' just after midnight", () => {
    const justAfterMidnight = romeInstant("2026-11-03", 5); // 00:05 del 03/11 = 23:05 UTC del 02/11
    expect(checkMemberRules({ start: romeInstant("2026-11-17", 480), slots: 1 }, S, OK, justAfterMidnight)).toEqual([]);
  });
  it("counts advance days across the DST change", () => {
    const beforeDst = romeInstant("2026-10-20", 600);
    expect(checkMemberRules({ start: romeInstant("2026-11-03", 22 * 60), slots: 1 }, S, OK, beforeDst)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-04", 480), slots: 1 }, S, OK, beforeDst))).toEqual(["TOO_FAR_AHEAD"]);
  });
  it("allows booking on the expiry day and rejects the day after", () => {
    const m = { ...OK, membershipExpiry: "2026-11-05" };
    expect(checkMemberRules({ start: romeInstant("2026-11-05", 1320), slots: 1 }, S, m, now)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-06", 480), slots: 1 }, S, m, now))).toEqual(["MEMBERSHIP_EXPIRED"]);
  });
  it("requires a membership", () => {
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, membershipExpiry: null }, now))).toEqual(["MEMBERSHIP_MISSING"]);
  });
  it("limits active bookings to 3", () => {
    expect(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, otherActiveBookings: 2 }, now)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, otherActiveBookings: 3 }, now))).toEqual(["TOO_MANY_ACTIVE"]);
  });
  it("rejects blocked members", () => {
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, blocked: true }, now))).toEqual(["BLOCKED"]);
  });
});

describe("change window", () => {
  const start = romeInstant("2026-11-02", 12 * 60);
  it("allows changes up to exactly 2 hours before", () => {
    expect(canMemberChange(start, romeInstant("2026-11-02", 10 * 60), S)).toBe(true);
    expect(canMemberChange(start, new Date(romeInstant("2026-11-02", 10 * 60).getTime() + 1000), S)).toBe(false);
  });
  it("marks admin cancellations under 2 hours as late", () => {
    expect(isLateCancellation(start, romeInstant("2026-11-02", 9 * 60), S)).toBe(false);
    expect(isLateCancellation(start, romeInstant("2026-11-02", 11 * 60), S)).toBe(true);
    expect(isLateCancellation(start, romeInstant("2026-11-02", 13 * 60), S)).toBe(true);
  });
});
