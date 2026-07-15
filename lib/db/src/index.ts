import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Firebase Configuration — read from environment variables (never hardcode secrets)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || "",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
  databaseURL: process.env.FIREBASE_DATABASE_URL || ""
};

// Initialize official Firebase App and Database client conditionally to prevent startup crash when environment variables are not set
let firebaseApp: any = null;
let database: any = null;

if (firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.databaseURL.startsWith("https://")) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    database = getDatabase(firebaseApp);
    if (!process.env.SILENT_DB_LOGS) {
      console.log("Firebase Database initialized successfully.");
    }
  } catch (err) {
    console.warn("Failed to initialize Firebase SDK:", err);
  }
} else {
  if (!process.env.SILENT_DB_LOGS) {
    console.info("Info: Firebase database not configured. Local JSON storage (db-fallback.json) is active.");
  }
}


// Helper to recursively parse ISO date strings back into Javascript Date objects
function parseDates(obj: any): any {
  if (!obj) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(parseDates);
  }
  if (typeof obj === "object") {
    const parsed = { ...obj };
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === "object") {
        parsed[key] = parseDates(val);
      } else if (typeof val === "string" && (key === "createdAt" || key === "issuedAt" || key === "date" || key === "updatedAt" || key === "repliedAt")) {
        if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
          parsed[key] = new Date(val);
        }
      }
    }
    return parsed;
  }
  return obj;
}

function isPlainObject(val: any): boolean {
  if (typeof val !== 'object' || val === null) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

// Helper to serialize Date objects back to ISO strings for Firebase storage
function serializeDates(obj: any): any {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(serializeDates);
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (isPlainObject(obj)) {
    const res: any = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = serializeDates(val);
    }
    return res;
  }
  return obj;
}

// Convert Firebase object map to array
function toArray<T>(obj: any): T[] {
  if (!obj) return [];
  let arr: any[] = [];
  if (Array.isArray(obj)) {
    arr = obj.filter(Boolean);
  } else {
    arr = Object.values(obj).filter(Boolean);
  }
  return parseDates(arr) as T[];
}

// Retrieve items list from Firebase Realtime Database (with short-lived cache)
const fbCache = new Map<string, { data: any[]; expiresAt: number }>();
const FB_CACHE_TTL_MS = 15000; // 15 seconds — balances freshness vs perf on burst reads

const fallbackFilePath = path.join(os.homedir(), "db-fallback.json");
let localDbState: Record<string, any[]> = {};

function loadLocalDb() {
  try {
    if (!process.env.SILENT_DB_LOGS) {
      console.log(`[Database] Active database file (persistent): ${fallbackFilePath}`);
    }
    if (fs.existsSync(fallbackFilePath)) {
      const content = fs.readFileSync(fallbackFilePath, "utf8");
      localDbState = JSON.parse(content);
    } else {
      localDbState = {};
    }
  } catch (err) {
    localDbState = {};
  }

  // Ensure default seeds are present dynamically
  if (!localDbState.users || localDbState.users.length === 0) {
    if (process.env.DEBUG_DB_LOGS) {
      console.log("Seeding default user accounts dynamically in local DB fallback...");
    }
    
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "aliop@app.com";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "ppooqqaa001122334455!@#$%";
    const adminName = process.env.DEFAULT_ADMIN_NAME || "علي / Ali";

    const testAdminPassword = process.env.DEFAULT_TEST_ADMIN_PASSWORD || "admin123";
    const testStudentPassword = process.env.DEFAULT_TEST_STUDENT_PASSWORD || "pass123";

    const adminAliHash = bcrypt.hashSync(adminPassword, 10);
    const testAdminHash = bcrypt.hashSync(testAdminPassword, 10);
    const testStudentHash = bcrypt.hashSync(testStudentPassword, 10);

    localDbState.users = [
      {
        id: 1,
        name: adminName,
        email: adminEmail,
        passwordHash: adminAliHash,
        role: "admin",
        points: 5000,
        streak: 30,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "أحمد الرشيدي / Ahmed Al-Rashidi",
        email: "admin@eduplatform.com",
        passwordHash: testAdminHash,
        role: "admin",
        points: 2450,
        streak: 14,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: "طالب تجريبي / علي حسين",
        email: "student@eduplatform.com",
        passwordHash: testStudentHash,
        role: "student",
        points: 150,
        streak: 4,
        createdAt: new Date().toISOString()
      }
    ];

    if (!localDbState.platform_settings || localDbState.platform_settings.length === 0) {
      localDbState.platform_settings = [
        { id: 1, key: "point_price_cents", value: "100", createdAt: new Date().toISOString() },
        { id: 2, key: "r2_bucket_name", value: "mharat-bucket", createdAt: new Date().toISOString() }
      ];
    }

    saveLocalDb();
  }
}

function saveLocalDb() {
  try {
    fs.writeFileSync(fallbackFilePath, JSON.stringify(localDbState, null, 2), "utf8");
  } catch (err) {
    // Silent fallback
  }
}

if (!database) {
  loadLocalDb();
}

async function fbGet(node: string): Promise<any[]> {
  validateFirebasePath(node);
  if (!database) {
    return parseDates(localDbState[node] || []) as any[];
  }
  const now = Date.now();
  const cached = fbCache.get(node);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }
  try {
    const snapshot = await get(ref(database, node));
    const data = toArray(snapshot.val());
    fbCache.set(node, { data, expiresAt: now + FB_CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error(`Firebase SDK GET error for node ${node}:`, err);
    return [];
  }
}

function fbInvalidate(node: string) {
  fbCache.delete(node);
}

// Write record to Firebase Realtime Database
async function fbPut(dbPath: string, data: any): Promise<void> {
  validateFirebasePath(dbPath);
  if (!database) {
    console.warn(`Firebase Database is not initialized. Using local fallback for PUT: ${dbPath}`);
    const segments = dbPath.split("/").filter(Boolean);
    const node = segments[0];
    const key = segments[1];
    if (node) {
      if (!localDbState[node]) {
        localDbState[node] = [];
      }
      const idVal = /^\d+$/.test(key) ? Number(key) : key;
      localDbState[node] = localDbState[node].filter(item => {
        if (!item) return false;
        return String(item.id) !== String(idVal);
      });
      localDbState[node].push(data);
      saveLocalDb();
    }
    return;
  }
  try {
    const serialized = serializeDates(data);
    await set(ref(database, dbPath), serialized);
  } catch (err) {
    console.error(`Firebase SDK PUT error for path ${dbPath}:`, err);
    throw err;
  }
}

// Delete record from Firebase Realtime Database
async function fbDelete(dbPath: string): Promise<void> {
  validateFirebasePath(dbPath);
  if (!database) {
    console.warn(`Firebase Database is not initialized. Using local fallback for DELETE: ${dbPath}`);
    const segments = dbPath.split("/").filter(Boolean);
    const node = segments[0];
    const key = segments[1];
    if (node && key) {
      if (localDbState[node]) {
        const idVal = /^\d+$/.test(key) ? Number(key) : key;
        localDbState[node] = localDbState[node].filter(item => {
          if (!item) return false;
          return String(item.id) !== String(idVal);
        });
        saveLocalDb();
      }
    }
    return;
  }
  try {
    await remove(ref(database, dbPath));
  } catch (err) {
    console.error(`Firebase SDK DELETE error for path ${dbPath}:`, err);
    throw err;
  }
}

// Map Drizzle table reference to Firebase node key
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
  if (str.includes("track")) {
    if (str.includes("module")) return "track_modules";
    return "tracks";
  }
  if (str.includes("mock_interview_sessions") || str.includes("mock_interview")) return "mock_interview_sessions";
  if (str.includes("mock_interview_messages")) return "mock_interview_messages";
  if (str.includes("consultation")) return "consultations";
  if (str.includes("deposit_request")) return "deposit_requests";
  if (str.includes("points_transaction")) return "points_transactions";
  if (str.includes("platform_setting")) return "platform_settings";
  if (str.includes("discount_code")) return "discount_codes";
  if (str.includes("payment_method")) return "payment_methods";
  
  return "unknown";
}

// Defensive: validate Firebase path segments contain only safe characters
const SAFE_PATH_REGEX = /^[a-zA-Z0-9_-]+$/;
function validateFirebasePath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  for (const seg of segments) {
    if (!SAFE_PATH_REGEX.test(seg)) {
      throw new Error(`Invalid Firebase path segment: "${seg}"`);
    }
  }
  return path;
}

const jsKeyMap = new Map<string, string>([
  ["workshop_id", "workshopId"],
  ["user_name", "userName"],
  ["track_id", "trackId"],
  ["module_id", "moduleId"],
  ["user_id", "userId"],
  ["estimated_minutes", "estimatedMinutes"],
  ["estimated_hours", "estimatedHours"],
  ["enrolled_count", "enrolledCount"],
  ["module_count", "moduleCount"],
  ["created_at", "createdAt"],
  ["completed_at", "completedAt"],
  ["icon_url", "iconUrl"],
  ["password_hash", "passwordHash"],
  ["avatar_url", "avatarUrl"],
  ["assigned_to", "assignedTo"],
  ["replied_by", "repliedBy"],
  ["replied_at", "repliedAt"],
  ["points_signature", "pointsSignature"],
  ["previous_signature", "previousSignature"],
  ["points_amount", "pointsAmount"],
  ["cash_amount", "cashAmount"],
  ["transfer_screenshot", "transferScreenshot"],
  ["admin_notes", "adminNotes"],
  ["sender_id", "senderId"],
  ["receiver_id", "receiverId"],
  ["discount_type", "discountType"],
  ["discount_code", "discountCode"],
  ["discount_value", "discountValue"],
  ["max_uses", "maxUses"],
  ["used_count", "usedCount"],
  ["expires_at", "expiresAt"],
  ["is_active", "isActive"],
  ["account_name", "accountName"],
  ["account_number", "accountNumber"],
  ["sort_order", "sortOrder"],
  ["updated_at", "updatedAt"],
  ["daily_room_url", "dailyRoomUrl"],
  ["daily_room_name", "dailyRoomName"],
  ["attended_minutes", "attendedMinutes"],
  ["is_answered", "isAnswered"],
  ["is_closed", "isClosed"],
  ["option_index", "optionIndex"],
  ["poll_id", "pollId"],
  ["company_category", "companyCategory"],
]);

function getJsKey(colName: string): string {
  return jsKeyMap.get(colName) || colName;
}

// Parse Drizzle condition into a local filter function
function parseCondition(cond: any): (item: any) => boolean {
  if (!cond) return () => true;

  // 1. Support Drizzle queryChunks (v0.31+)
  if (cond.queryChunks && Array.isArray(cond.queryChunks)) {
    // Check if any chunk is a nested SQL object (compound condition like and/or)
    const hasNestedChunks = cond.queryChunks.some((c: any) => c && typeof c === "object" && c.queryChunks);
    
    if (hasNestedChunks) {
      // Split by AND/OR string literals and recursively parse
      const chunks = cond.queryChunks;
      const subConditions: any[] = [];
      let currentIsOr = false;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (typeof chunk === "string") {
          const lower = chunk.trim().toUpperCase();
          if (lower === "AND" || lower === ",") currentIsOr = false;
          else if (lower === "OR") currentIsOr = true;
        } else if (chunk && typeof chunk === "object" && chunk.queryChunks) {
          subConditions.push({ cond: chunk, isOr: currentIsOr });
        }
      }

      if (subConditions.length > 0) {
        const evaluators = subConditions.map((sc: any) => parseCondition(sc.cond));
        const isOr = subConditions[0].isOr;
        return (item: any) => {
          if (isOr) return evaluators.some((fn: any) => fn(item));
          return evaluators.every((fn: any) => fn(item));
        };
      }
    }
    
    // Simple eq/ne/gt/lt condition: one column + one value
    const colChunk = cond.queryChunks.find((c: any) => c && typeof c === "object" && "name" in c && "table" in c);
    const paramChunk = cond.queryChunks.find((c: any) => c && typeof c === "object" && "value" in c && !("table" in c) && !Array.isArray(c.value));
    
    if (colChunk && paramChunk) {
      const colName = getJsKey(colChunk.name);
      const rightVal = paramChunk.value;
      const operatorStr = cond.queryChunks.map((c: any) => String(c.value || c)).join(" ");
      const isNe = operatorStr.includes("<>") || operatorStr.includes("!=");
      const isLike = operatorStr.toLowerCase().includes("like");
      const isGt = operatorStr.includes(" > ") || operatorStr.includes(" >");
      const isGte = operatorStr.includes(" >= ") || operatorStr.includes(" >=");
      const isLt = operatorStr.includes(" < ") || operatorStr.includes(" <");
      const isLte = operatorStr.includes(" <= ") || operatorStr.includes(" <=");
      
      return (item: any) => {
        const itemVal = item[colName];
        if (isNe) return String(itemVal) != String(rightVal);
        if (isLike) return String(itemVal).toLowerCase().includes(String(rightVal).toLowerCase());
        if (isGte) return Number(itemVal) >= Number(rightVal);
        if (isGt) return Number(itemVal) > Number(rightVal);
        if (isLte) return Number(itemVal) <= Number(rightVal);
        if (isLt) return Number(itemVal) < Number(rightVal);
        return String(itemVal) == String(rightVal);
      };
    }
  }

  // 2. Support standard composite conditions (and / or)
  if (cond.conditions && Array.isArray(cond.conditions)) {
    const evaluators = cond.conditions.map(parseCondition);
    const isOr = cond.operator === "or";
    return (item: any) => {
      if (isOr) {
        return evaluators.some((evalFn: any) => evalFn(item));
      } else {
        return evaluators.every((evalFn: any) => evalFn(item));
      }
    };
  }

  // 3. Fallback support for older Drizzle left/right format
  const colName = getJsKey(cond.left?.name);
  if (colName) {
    let rightVal = cond.right;
    
    if (rightVal && typeof rightVal === "object") {
      if ("value" in rightVal) {
        rightVal = rightVal.value;
      } else if ("params" in rightVal && Array.isArray(rightVal.params) && rightVal.params.length > 0) {
        rightVal = rightVal.params[0];
      } else if ("query" in rightVal) {
        rightVal = rightVal.query;
      }
    }
    
    const op = cond.operator || "eq";
    
    return (item: any) => {
      const itemVal = item[colName];
      
      if (op === "eq") {
        return String(itemVal) == String(rightVal);
      }
      if (op === "ne") {
        return String(itemVal) != String(rightVal);
      }
      if (op === "gt") {
        return Number(itemVal) > Number(rightVal);
      }
      if (op === "gte") {
        return Number(itemVal) >= Number(rightVal);
      }
      if (op === "lt") {
        return Number(itemVal) < Number(rightVal);
      }
      if (op === "lte") {
        return Number(itemVal) <= Number(rightVal);
      }
      if (op === "like" || op === "ilike") {
        return String(itemVal).toLowerCase().includes(String(rightVal).toLowerCase());
      }
      return true;
    };
  }

  // SAFETY: never return () => true on failure — that matches ALL records silently
  console.error("parseCondition: unrecognized condition format, returning match-none filter");
  return () => false;
}

// Helper to wrap a promise in a Drizzle-compatible chain builder
function makeQuery<T>(promise: Promise<T>): any {
  const p = promise as any;
  
  p.where = (cond: any) => {
    const nextPromise = promise.then(async (data: any) => {
      const arr = Array.isArray(data) ? data : [data];
      const filterFn = parseCondition(cond);
      return arr.filter(filterFn);
    });
    return makeQuery(nextPromise);
  };

  p.orderBy = (order: any) => {
    const nextPromise = promise.then(async (data: any) => {
      const arr = Array.isArray(data) ? data : [data];
      const colName = order?.name || (order && typeof order === "object" && "column" in order ? (order as any).column?.name : null);
      if (colName) {
        const isDesc = String(order).includes("desc");
        return [...arr].sort((a, b) => {
          if (a[colName] < b[colName]) return isDesc ? 1 : -1;
          if (a[colName] > b[colName]) return isDesc ? -1 : 1;
          return 0;
        });
      }
      return arr;
    });
    return makeQuery(nextPromise);
  };

  p.returning = () => {
    return p;
  };

  return p;
}

// Mock PostgreSQL pool for compatibility
export const pool = new pg.Pool();

// Drizzle-to-Firebase Emulator DB Client using official Firebase JS SDK
const dbMock = {
  // Execute TRUNCATE command mock
  execute: async (sqlQuery: any) => {
    const sqlStr = String(sqlQuery).toLowerCase();
    if (sqlStr.includes("truncate")) {
      await set(ref(database, "/"), null);
      console.log("Firebase Realtime Database cleared for seeding.");
    }
    return [];
  },

  // SELECT mock
  select: (...args: any[]) => {
    return {
      from: (table: any) => {
        const tableName = getTableName(table);
        const promise = fbGet(tableName);
        return makeQuery(promise);
      }
    };
  },

  // INSERT mock
  insert: (table: any) => {
    const tableName = getTableName(table);
    return {
      values: (data: any) => {
        const records = Array.isArray(data) ? data : [data];
        const promise = (async () => {
          const results = [];
          const current = await fbGet(tableName);
          let maxId = current.length > 0 ? Math.max(...current.map((r: any) => r.id)) : 0;
          
          for (const item of records) {
            let id = item.id;
            if (!id) {
              maxId += 1;
              id = maxId;
            }
            const cleaned: any = {};
            for (const [key, val] of Object.entries(item)) {
              if (val !== undefined) {
                cleaned[key] = val;
              }
            }
            const record = { 
              ...cleaned, 
              id, 
              createdAt: cleaned.createdAt || new Date(), 
              issuedAt: cleaned.issuedAt || new Date() 
            };
            
            await fbPut(`${tableName}/${id}`, record);
            fbInvalidate(tableName);
            results.push(parseDates(record));
          }
          return results;
        })();
        return makeQuery(promise);
      }
    };
  },

  // UPDATE mock
  update: (table: any) => {
    const tableName = getTableName(table);
    return {
      set: (data: any) => {
        return {
          where: (cond: any) => {
            const promise = (async () => {
              const current = await fbGet(tableName);
              const filterFn = parseCondition(cond);
              const matching = current.filter(filterFn);
              const results = [];
              
              for (const item of matching) {
                const updated = { ...item };
                for (const [key, val] of Object.entries(data)) {
                  if (val === undefined) continue;
                  updated[key] = val;
                }
                await fbPut(`${tableName}/${item.id}`, updated);
                results.push(parseDates(updated));
              }
              fbInvalidate(tableName);
              return results;
            })();
            return makeQuery(promise);
          }
        };
      }
    };
  },

  // DELETE mock
  delete: (table: any) => {
    const tableName = getTableName(table);
    return {
      where: (cond: any) => {
        const promise = (async () => {
          const current = await fbGet(tableName);
          const filterFn = parseCondition(cond);
          const matching = current.filter(filterFn);
          for (const item of matching) {
            await fbDelete(`${tableName}/${item.id}`);
          }
          fbInvalidate(tableName);
          return matching;
        })();
        return makeQuery(promise);
      }
    };
  }
};

export const db = dbMock as unknown as ReturnType<typeof drizzle>;

export * from "./schema";
