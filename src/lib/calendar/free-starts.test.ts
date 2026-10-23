import { describe, expect, it } from "vitest";
import type { RuleSettings } from "@/lib/booking-rules";
import { freeStarts } from "./free-starts";

const S: RuleSettings = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2 };

describe("freeStarts", () => {
  it("offers every 15 minutes on an empty field, with 2 slots when they fit", () => {
    const r = freeStarts({ slotMinutes: 60, settings: S, busy: [] });
    expect(r[0]).toEqual({ minute: 480, maxSlots: 2 });
    expect(r.find((x) => x.minute === 1260)).toEqual({ minute: 1260, maxSlots: 2 }); // 21:00–23:00
    expect(r.find((x) => x.minute === 1275)).toEqual({ minute: 1275, maxSlots: 1 }); // 21:15: solo 1h
    expect(r.at(-1)).toEqual({ minute: 1320, maxSlots: 1 }); // 22:00
  });
  it("skips starts that would overlap and limits the second slot", () => {
    const r = freeStarts({ slotMinutes: 60, settings: S, busy: [{ startMin: 600, endMin: 660 }] });
    expect(r.find((x) => x.minute === 555)).toBeUndefined(); // 09:15–10:15 si sovrappone
    expect(r.find((x) => x.minute === 540)).toEqual({ minute: 540, maxSlots: 1 }); // 09:00–10:00
    expect(r.find((x) => x.minute === 480)).toEqual({ minute: 480, maxSlots: 2 }); // 08:00–10:00
    expect(r.find((x) => x.minute === 660)).toEqual({ minute: 660, maxSlots: 2 });
  });
  it("hides starts already passed today", () => {
    const r = freeStarts({ slotMinutes: 60, settings: S, busy: [], notBeforeMinute: 600 });
    expect(r[0].minute).toBe(615);
  });
});
