// Set passwords for existing accounts, in place, using the same bcryptjs
// hashing the app uses for register/reset (cost 12, see modules/auth).
//
// Usage (inside the api container, where prisma + bcryptjs are installed):
//   node scripts/set-passwords.mjs '<json>'
//   json = {"admin@hazl.id":"...", "trainer1@jagoakademi.com":"..."}
//
// Passwords are taken from argv only — never written to disk or logged.
// Refuses anything shorter than 8 chars or all-numeric (app password policy).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const raw = process.argv[2];
if (!raw) {
  console.error("usage: node scripts/set-passwords.mjs '{\"email\":\"password\",...}'");
  process.exit(1);
}
const map = JSON.parse(raw);
const prisma = new PrismaClient();

let failed = 0;
for (const [email, password] of Object.entries(map)) {
  if (typeof password !== "string" || password.length < 8 || /^\d+$/.test(password)) {
    console.error(`SKIP ${email}: password must be >= 8 chars and not all digits`);
    failed++;
    continue;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error(`SKIP ${email}: no such user`);
    failed++;
    continue;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      // Invalidate any pending reset link so the old flow can't undo this.
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  });
  console.log(`OK   ${email}`);
}
await prisma.$disconnect();
process.exit(failed ? 2 : 0);
