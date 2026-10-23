import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { activateAccount, verifyCredentials } from "./accounts";
import { makeMember, resetDb } from "../../tests/helpers/db";

async function code(p: Promise<unknown>) {
  const e = await p.then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(DomainError);
  return (e as DomainError).violations[0].code;
}

describe("accounts", () => {
  beforeEach(resetDb);

  it("activates with matching card number and email", async () => {
    const m = await makeMember({ email: "mario.rossi@example.it", number: "PG-0042", password: null });
    await activateAccount(prisma, { cardNumber: "PG-0042", email: "mario.rossi@example.it", password: "segreta123" });
    expect(await verifyCredentials(prisma, "mario.rossi@example.it", "segreta123")).toMatchObject({ id: m.id });
  });

  it("ignores case and surrounding spaces in email and card number", async () => {
    await makeMember({ email: "mario.rossi@example.it", number: "PG-0042", password: null });
    await activateAccount(prisma, { cardNumber: " pg-0042 ", email: " Mario.Rossi@Example.it ", password: "segreta123" });
    expect(await verifyCredentials(prisma, "MARIO.ROSSI@example.it ", "segreta123")).not.toBeNull();
  });

  it("gives the same error for a wrong card number or a wrong email", async () => {
    await makeMember({ email: "a@example.it", number: "PG-1", password: null });
    await makeMember({ email: "b@example.it", number: "PG-2", password: null });
    expect(await code(activateAccount(prisma, { cardNumber: "PG-9", email: "a@example.it", password: "segreta123" }))).toBe("ACTIVATION_MISMATCH");
    expect(await code(activateAccount(prisma, { cardNumber: "PG-1", email: "b@example.it", password: "segreta123" }))).toBe("ACTIVATION_MISMATCH");
  });

  it("refuses an already active account and short passwords", async () => {
    await makeMember({ email: "a@example.it", number: "PG-1" });
    await makeMember({ email: "b@example.it", number: "PG-2", password: null });
    expect(await code(activateAccount(prisma, { cardNumber: "PG-1", email: "a@example.it", password: "segreta123" }))).toBe("ALREADY_ACTIVE");
    expect(await code(activateAccount(prisma, { cardNumber: "PG-2", email: "b@example.it", password: "corta" }))).toBe("PASSWORD_TOO_SHORT");
  });

  it("rejects wrong passwords and accounts not yet activated", async () => {
    await makeMember({ email: "a@example.it" });
    await makeMember({ email: "b@example.it", password: null });
    expect(await verifyCredentials(prisma, "a@example.it", "sbagliata")).toBeNull();
    expect(await verifyCredentials(prisma, "b@example.it", "")).toBeNull();
    expect(await verifyCredentials(prisma, "nessuno@example.it", "x")).toBeNull();
  });
});
