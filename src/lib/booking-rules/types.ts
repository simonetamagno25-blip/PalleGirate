export type RuleSettings = {
  openMinutes: number;
  closeMinutes: number;
  startStepMinutes: number;
  maxAdvanceDays: number;
  maxActiveBookings: number;
  changeWindowMinutes: number;
  maxSlotsPerBooking: number;
};

export type RuleField = { slotMinutes: number; active: boolean };

export type SlotRequest = { start: Date; slots: number };

export type MemberState = {
  /** Ultimo giorno valido della tessera (YYYY-MM-DD), null se il socio non ha tessera. */
  membershipExpiry: string | null;
  /** Prenotazioni CONFIRMED future, esclusa quella in modifica. */
  otherActiveBookings: number;
  blocked: boolean;
};

export type ViolationCode =
  | "START_NOT_ON_STEP"
  | "BEFORE_OPENING"
  | "AFTER_CLOSING"
  | "INVALID_SLOTS"
  | "FIELD_INACTIVE"
  | "IN_PAST"
  | "TOO_FAR_AHEAD"
  | "MEMBERSHIP_MISSING"
  | "MEMBERSHIP_EXPIRED"
  | "TOO_MANY_ACTIVE"
  | "BLOCKED"
  | "SLOT_TAKEN"
  | "CHANGE_WINDOW_CLOSED"
  | "ALREADY_CANCELLED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "ACTIVATION_MISMATCH"
  | "ALREADY_ACTIVE"
  | "PASSWORD_TOO_SHORT"
  | "INVALID_CREDENTIALS"
  | "PASSWORD_TOO_LONG";

export type Violation = { code: ViolationCode; params?: Record<string, string | number> };
