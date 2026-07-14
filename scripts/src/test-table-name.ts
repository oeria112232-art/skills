import { workshopsTable, usersTable, jobsTable, examQuestionsTable, certificatesTable } from "@workspace/db";

function getTableName(table: any): string {
  if (table?._?.name) return table._.name;
  
  const nameSymbol = Object.getOwnPropertySymbols(table || {}).find(s => s.toString().includes("drizzle:Name"));
  if (nameSymbol && table) return (table as any)[nameSymbol];

  const str = String(table).toLowerCase();
  if (str.includes("workshop")) return "workshops";
  if (str.includes("users")) return "users";
  if (str.includes("jobs")) return "jobs";
  if (str.includes("screening")) return "screening_questions";
  if (str.includes("application")) return "applications";
  if (str.includes("enrollment")) return "enrollments";
  if (str.includes("exam")) return "exam_questions";
  if (str.includes("certificate")) return "certificates";
  
  return "unknown (String output: " + str + ")";
}

console.log("workshopsTable name:", getTableName(workshopsTable));
console.log("usersTable name:", getTableName(usersTable));
console.log("jobsTable name:", getTableName(jobsTable));
console.log("examQuestionsTable name:", getTableName(examQuestionsTable));
console.log("certificatesTable name:", getTableName(certificatesTable));

process.exit(0);
