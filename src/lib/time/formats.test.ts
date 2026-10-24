import { describe, expect, it } from "vitest";
import { DATE_TIME_MEDIUM, DATE_TIME_SHORT, LONG_DAY_TIME, SHORT_DAY_TIME, TIME_ONLY } from "./formats";

const evening = new Date("2026-10-24T16:30:00Z"); // 18:30 a Roma
const midnight = new Date("2026-10-23T22:05:00Z"); // 00:05 a Roma

describe("24-hour formats", () => {
  for (const locale of ["en", "it"]) {
    for (const [name, opts] of Object.entries({ TIME_ONLY, SHORT_DAY_TIME, LONG_DAY_TIME, DATE_TIME_SHORT, DATE_TIME_MEDIUM })) {
      it(`${name} is 24h in ${locale}`, () => {
        const f = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Rome", ...opts });
        expect(f.format(evening)).toMatch(/18:30/);
        expect(f.format(evening)).not.toMatch(/[AP]M/i);
        expect(f.format(midnight)).toMatch(/00:05/);
      });
    }
  }
});
