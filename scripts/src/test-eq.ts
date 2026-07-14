import { eq } from "drizzle-orm";
import { workshopsTable } from "@workspace/db";

const cond = eq(workshopsTable.id, 4);
console.log("Drizzle Eq Condition keys:", Object.keys(cond));
console.log("Full condition object:", cond);
process.exit(0);
