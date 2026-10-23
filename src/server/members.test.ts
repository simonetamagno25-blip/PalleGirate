import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { createMember, renewMembership, resetAccess, setAdmin, updateMember, type MemberInput } from "./members";
import { makeAdmin, makeMember, resetDb } from "../../tests/helpers/db";

const input = (o: Partial<MemberInput> = {}): MemberInput => ({
  firstName: "Anna", lastName: "Blu", email: " Anna.Blu@Example.it ", cardNumber: " pg 0100 ",
  issueDate: "2026-10-13", expiryDate: "2027-10-13", ...o,
});
const code = async (p: Promise<unknown>) => ((await p.then(() => null, (e) => e)) as DomainError).violations[0].code;

describe("members service", () => {
  beforeEach(resetDb);

  it("creates a member with normalized email and card, not yet activated", async () => {
    const u = await createMember(prisma, input());
    const full = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, include: { membership: { include: { renewals: true } } } });
    expect(full.email).toBe("anna.blu@example.it");
    expect(full.membership?.number).toBe("PG0100");
    expect(full.passwordHash).toBeNull();
    expect(full.membership?.renewals).toHaveLength(1);
  });

  it("rejects duplicate email or card number", async () => {
    await createMember(prisma, input());
    expect(await code(createMember(prisma, input({ cardNumber: "PG0101" })))).toBe("EMAIL_TAKEN");
    expect(await code(createMember(prisma, input({ email: "altra@example.it" })))).toBe("CARD_TAKEN");
  });

  it("updates data keeping the same card", async () => {
    const u = await createMember(prisma, input());
    await updateMember(prisma, u.id, input({ phone: "333", expiryDate: "2027-12-31" }));
    const m = await prisma.membership.findUniqueOrThrow({ where: { userId: u.id } });
    expect(m.expiryDate).toBe("2027-12-31");
  });

  it("renews keeping the number and logging history", async () => {
    const u = await createMember(prisma, input({ expiryDate: "2026-10-20" }));
    const m = await renewMembership(prisma, u.id, "2026-10-01");
    expect(m).toMatchObject({ number: "PG0100", issueDate: "2026-10-01", expiryDate: "2027-10-20" });
    expect(await prisma.membershipRenewal.count({ where: { membershipId: m.id } })).toBe(2);
    expect((await renewMembership(prisma, u.id, "2026-10-01", "2027-12-31")).expiryDate).toBe("2027-12-31");
  });

  it("reset access makes the account 'to activate' again and kills sessions", async () => {
    const m = await makeMember();
    await resetAccess(prisma, m.id);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: m.id } });
    expect(after.passwordHash).toBeNull();
    expect(after.sessionVersion).toBe(m.sessionVersion + 1);
  });

  it("promotes users but an admin cannot demote themselves", async () => {
    const admin = await makeAdmin();
    const m = await makeMember();
    await setAdmin(prisma, admin.id, m.id, true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).isAdmin).toBe(true);
    expect(await code(setAdmin(prisma, admin.id, admin.id, false))).toBe("CANNOT_DEMOTE_SELF");
  });
});
