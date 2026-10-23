import type { Violation } from "@/lib/booking-rules";

export class DomainError extends Error {
  constructor(readonly violations: Violation[]) {
    super(violations.map((v) => v.code).join(","));
    this.name = "DomainError";
  }
}

export const fail = (code: Violation["code"], params?: Violation["params"]): never => {
  throw new DomainError([{ code, params }]);
};
