// Shared between the Zod schema (lib/registration.ts) and the register form UI.
// Kept dependency-free so the client bundle can import it without pulling in
// bcrypt/Prisma from lib/registration.ts.
export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_REQUIREMENTS = "Minim 6 caractere.";
