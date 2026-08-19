import { db, tracksTable, trackModulesTable } from "@workspace/db";
import { gt } from "drizzle-orm";

async function run() {
  console.log("Deleting all modules...");
  await db.delete(trackModulesTable).where(gt(trackModulesTable.id, 0));
  
  console.log("Deleting all learning tracks...");
  await db.delete(tracksTable).where(gt(tracksTable.id, 0));
  
  console.log("✓ Deleted all tracks and modules successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Failed to delete tracks:", err);
  process.exit(1);
});
