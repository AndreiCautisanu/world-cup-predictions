// Mock Next.js server globals and heavy deps so only the Zod schema is exercised.
jest.mock("next/server", () => ({ NextResponse: { json: jest.fn() } }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/session", () => ({ getSessionUser: jest.fn() }));
jest.mock("@/lib/audit", () => ({ logAdminAction: jest.fn() }));
jest.mock("bcryptjs", () => ({ hash: jest.fn() }));

import { updateUserSchema } from "@/app/api/admin/users/route";

describe("updateUserSchema", () => {
  it("accepts a first/last name update", () => {
    const r = updateUserSchema.safeParse({
      userId: 1,
      firstName: "Andrei",
      lastName: "Popescu",
    });
    expect(r.success).toBe(true);
  });

  it("accepts clearing a name with an empty string", () => {
    const r = updateUserSchema.safeParse({ userId: 1, firstName: "" });
    expect(r.success).toBe(true);
  });

  it("trims surrounding whitespace on names", () => {
    const r = updateUserSchema.safeParse({ userId: 1, firstName: "  Ana  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.firstName).toBe("Ana");
  });

  it("rejects names longer than 50 chars", () => {
    const r = updateUserSchema.safeParse({ userId: 1, lastName: "x".repeat(51) });
    expect(r.success).toBe(false);
  });

  it("rejects a payload with nothing to change", () => {
    const r = updateUserSchema.safeParse({ userId: 1 });
    expect(r.success).toBe(false);
  });

  it("still accepts an isAdmin-only update", () => {
    const r = updateUserSchema.safeParse({ userId: 1, isAdmin: true });
    expect(r.success).toBe(true);
  });
});
