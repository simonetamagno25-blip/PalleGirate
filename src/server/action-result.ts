import type { Violation } from "@/lib/booking-rules";
import { DomainError } from "./errors";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; violations: Violation[] };

/** Le Server Action non lanciano mai DomainError al client: lo trasformano in un risultato da tradurre. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, violations: e.violations };
    throw e;
  }
}
