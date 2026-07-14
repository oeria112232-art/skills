import { db, certificatesTable } from "@workspace/db";

async function run() {
  console.log("--- Certificates in Database ---");
  const certs = await db.select().from(certificatesTable);
  console.dir(certs);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
