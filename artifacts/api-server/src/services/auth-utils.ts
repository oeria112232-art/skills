import bcrypt from "bcryptjs";

/**
 * Hashes a password using bcrypt with a cost factor of 10.
 * @param pw - The plain text password to hash.
 * @returns The hashed password.
 */
export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}
