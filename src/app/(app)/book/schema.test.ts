import { describe, expect, it } from "vitest";
import { submitSchema } from "./schema";

const base = { mode: "member" as const, fieldId: "f1", day: "2026-10-24", minute: 600, slots: 1 };

describe("submitSchema", () => {
  it("accepts a valid day", () => {
    expect(submitSchema.safeParse(base).success).toBe(true);
  });
  it("rejects impossible or malformed days", () => {
    expect(submitSchema.safeParse({ ...base, day: "2026-13-45" }).success).toBe(false);
    expect(submitSchema.safeParse({ ...base, day: "2026-02-30" }).success).toBe(false);
    expect(submitSchema.safeParse({ ...base, day: "nope" }).success).toBe(false);
  });
});
