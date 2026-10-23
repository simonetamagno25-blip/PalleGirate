import { addDays, romeDay } from "@/lib/time/rome";
import type { MemberState, RuleSettings, SlotRequest, Violation } from "./types";

/** Regole che valgono solo per le prenotazioni fatte come socio. */
export function checkMemberRules(req: SlotRequest, s: RuleSettings, m: MemberState, now: Date): Violation[] {
  const v: Violation[] = [];
  if (m.blocked) v.push({ code: "BLOCKED" });
  if (req.start.getTime() <= now.getTime()) v.push({ code: "IN_PAST" });

  const day = romeDay(req.start);
  const lastDay = addDays(romeDay(now), s.maxAdvanceDays);
  if (day > lastDay) v.push({ code: "TOO_FAR_AHEAD", params: { days: s.maxAdvanceDays, lastDay } });

  if (m.membershipExpiry === null) v.push({ code: "MEMBERSHIP_MISSING" });
  else if (day > m.membershipExpiry) v.push({ code: "MEMBERSHIP_EXPIRED", params: { expiry: m.membershipExpiry } });

  if (m.otherActiveBookings >= s.maxActiveBookings) v.push({ code: "TOO_MANY_ACTIVE", params: { max: s.maxActiveBookings } });
  return v;
}

export function canMemberChange(start: Date, now: Date, s: RuleSettings): boolean {
  return now.getTime() <= start.getTime() - s.changeWindowMinutes * 60_000;
}

export function isLateCancellation(start: Date, now: Date, s: RuleSettings): boolean {
  return !canMemberChange(start, now, s);
}
