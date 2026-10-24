import { describe, expect, it } from "vitest";
import { hourCells, nextDepartures } from "./board";

describe("nextDepartures", () => {
  it("takes the first free start and then the next ones at least one slot apart", () => {
    expect(nextDepartures([600, 615, 630, 660, 675, 720, 780], 3, 60)).toEqual([600, 660, 720]);
  });
  it("returns fewer when the day runs out, and nothing when there is no free start", () => {
    expect(nextDepartures([1260, 1275], 3, 60)).toEqual([1260]);
    expect(nextDepartures([], 3, 60)).toEqual([]);
  });
  it("respects a 90 minute gap for football", () => {
    expect(nextDepartures([480, 495, 570, 585, 660], 3, 90)).toEqual([480, 570, 660]);
  });
});

describe("hourCells", () => {
  const base = { openMinutes: 480, closeMinutes: 600 }; // 08:00–10:00: two cells

  it("shows the first free start of each hour", () => {
    expect(hourCells({ ...base, starts: [495, 510, 540], bookings: [] })).toEqual([
      { hour: 8, kind: "free", minute: 495 },
      { hour: 9, kind: "free", minute: 540 },
    ]);
  });

  it("marks your booking where it starts and while it continues, before free starts", () => {
    const cells = hourCells({ ...base, starts: [], bookings: [{ startMin: 510, endMin: 570, mine: true }] });
    expect(cells).toEqual([
      { hour: 8, kind: "mine", startMin: 510, endMin: 570 },
      { hour: 9, kind: "mine", startMin: 510, endMin: 570 },
    ]);
    // A free start later in the hour wins over the continuation of your booking.
    expect(hourCells({ ...base, starts: [570], bookings: [{ startMin: 480, endMin: 570, mine: true }] })[1]).toEqual({ hour: 9, kind: "free", minute: 570 });
  });

  it("marks other bookings as taken without a name for members, and keeps the name for admins", () => {
    expect(hourCells({ ...base, starts: [], bookings: [{ startMin: 480, endMin: 540, mine: false }] })[0]).toEqual({ hour: 8, kind: "taken", memberName: undefined });
    expect(hourCells({ ...base, starts: [], bookings: [{ startMin: 480, endMin: 540, mine: false, memberName: "Anna Rossi" }] })[0]).toEqual({ hour: 8, kind: "taken", memberName: "Anna Rossi" });
  });

  it("marks hours with no start and no booking as unavailable (past or too close to closing)", () => {
    expect(hourCells({ ...base, starts: [], bookings: [] }).map((c) => c.kind)).toEqual(["unavailable", "unavailable"]);
  });
});
