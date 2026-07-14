import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import * as schema from "./schema";

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

if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
  console.error("FIREBASE_API_KEY and FIREBASE_DATABASE_URL must be set in environment variables.");
}

// Initialize official Firebase App and Database client
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

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
const FB_CACHE_TTL_MS = 3000; // 3 seconds — balances freshness vs perf on burst reads

async function fbGet(node: string): Promise<any[]> {
  validateFirebasePath(node);
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
async function fbPut(path: string, data: any): Promise<void> {
  validateFirebasePath(path);
  try {
    const serialized = serializeDates(data);
    await set(ref(database, path), serialized);
  } catch (err) {
    console.error(`Firebase SDK PUT error for path ${path}:`, err);
    throw err;
  }
}

// Delete record from Firebase Realtime Database
async function fbDelete(path: string): Promise<void> {
  validateFirebasePath(path);
  try {
    await remove(ref(database, path));
  } catch (err) {
    console.error(`Firebase SDK DELETE error for path ${path}:`, err);
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

function getJsKey(colName: string): string {
  if (colName === "workshop_id") return "workshopId";
  if (colName === "user_name") return "userName";
  if (colName === "track_id") return "trackId";
  if (colName === "module_id") return "moduleId";
  if (colName === "user_id") return "userId";
  if (colName === "estimated_minutes") return "estimatedMinutes";
  if (colName === "estimated_hours") return "estimatedHours";
  if (colName === "enrolled_count") return "enrolledCount";
  if (colName === "module_count") return "moduleCount";
  if (colName === "created_at") return "createdAt";
  if (colName === "completed_at") return "completedAt";
  if (colName === "icon_url") return "iconUrl";
  if (colName === "password_hash") return "passwordHash";
  if (colName === "avatar_url") return "avatarUrl";
  if (colName === "assigned_to") return "assignedTo";
  if (colName === "replied_by") return "repliedBy";
  if (colName === "replied_at") return "repliedAt";
  if (colName === "points_signature") return "pointsSignature";
  if (colName === "previous_signature") return "previousSignature";
  if (colName === "points_amount") return "pointsAmount";
  if (colName === "cash_amount") return "cashAmount";
  if (colName === "transfer_screenshot") return "transferScreenshot";
  if (colName === "admin_notes") return "adminNotes";
  if (colName === "sender_id") return "senderId";
  if (colName === "receiver_id") return "receiverId";
  if (colName === "discount_type") return "discountType";
  if (colName === "discount_value") return "discountValue";
  if (colName === "max_uses") return "maxUses";
  if (colName === "used_count") return "usedCount";
  if (colName === "expires_at") return "expiresAt";
  if (colName === "is_active") return "isActive";
  if (colName === "account_name") return "accountName";
  if (colName === "account_number") return "accountNumber";
  if (colName === "sort_order") return "sortOrder";
  if (colName === "updated_at") return "updatedAt";
  if (colName === "daily_room_url") return "dailyRoomUrl";
  if (colName === "daily_room_name") return "dailyRoomName";
  if (colName === "attended_minutes") return "attendedMinutes";
  if (colName === "is_answered") return "isAnswered";
  if (colName === "is_closed") return "isClosed";
  if (colName === "option_index") return "optionIndex";
  if (colName === "poll_id") return "pollId";
  return colName;
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

export const db = (dbMock as any) as ReturnType<typeof drizzle>;

export * from "./schema";
