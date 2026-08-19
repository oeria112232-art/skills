import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.select({ count: sql`count(*)` }).from(usersTable);
  console.log("Result:", result);
}

main().catch(console.error);
