import { db, trackModulesTable, tracksTable } from "@workspace/db";

async function run() {
  console.log("--- Tracks in Database ---");
  const tracks = await db.select().from(tracksTable);
  console.dir(tracks);

  console.log("--- Modules in Database ---");
  const modules = await db.select().from(trackModulesTable);
  console.dir(modules);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
